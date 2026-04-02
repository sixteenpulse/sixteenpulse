import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { CalComClient, fetchBookingFieldLabels, discoverProfileSlug } from "@/lib/calcom-api";


export async function POST(req: Request) {
  try {
    const { connectionId } = await req.json();

    if (!connectionId) {
      return NextResponse.json({ error: "connectionId required" }, { status: 400 });
    }

    const connection = await prisma.calConnection.findUnique({
      where: { id: connectionId }
    });

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    const apiKey = decrypt(connection.access_token);
    const client = new CalComClient(apiKey);

    // Fetch bookings (fast) — this is the critical path
    const [activeBookings, cancelledBookings] = await Promise.all([
      client.getBookings(),
      client.getBookings({ status: "cancelled" }),
    ]);
    const bookings = [...activeBookings, ...cancelledBookings];

    // ─── Use cached field labels, or fetch lazily ────────────
    const connMeta = (connection.metadata as any) || {};
    let fieldLabelsMap: Record<string, Record<string, string>> = connMeta.fieldLabelsMap || {};
    const labelsLastFetched = connMeta.labelsLastFetched || 0;
    const labelsStale = Date.now() - labelsLastFetched > 30 * 60 * 1000; // refresh every 30 min

    // ─── Sync bookings (fast path) ──────────────────────────
    let totalSynced = 0;

    const now = new Date();
    const BATCH_SIZE = 50;

    for (let i = 0; i < bookings.length; i += BATCH_SIZE) {
      const batch = bookings.slice(i, i + BATCH_SIZE);
      const transactionOps = [];

      for (const b of batch) {
        let status = "OTHER";
        const s = (b.status || "").toUpperCase();
        if (s === "ACCEPTED" || s === "PENDING" || s === "CONFIRMED") status = "SCHEDULED";
        else if (s === "CANCELLED" || s === "REJECTED") status = "CANCELLED";
        else if (s === "COMPLETED") status = "COMPLETED";
        else if (s === "RESCHEDULED") status = "RESCHEDULED";

        // Cal.id keeps past bookings as "accepted" — auto-mark as COMPLETED if end time has passed
        if (status === "SCHEDULED" && b.endTime && new Date(b.endTime) < now) {
          status = "COMPLETED";
        }

        const numericId = b.id ? b.id.toString() : "";
        const uid = b.uid || numericId;
        if (!numericId && !uid) continue;
        const bookingId = numericId || uid;

        const etId = b.eventTypeId?.toString() || b.eventType?.id?.toString() || "";
        const bookingFieldLabels = fieldLabelsMap[etId] || {};

        // Migrate old UID-based records to numeric ID
        if (uid && uid !== bookingId) {
          transactionOps.push(
            prisma.booking.deleteMany({
              where: {
                cal_connection_id: connection.id,
                cal_booking_id: uid,
              }
            })
          );
        }

        const metadata = {
          uid,
          numericId,
          description: b.description,
          location: b.location,
          responses: b.responses,
          attendees: b.attendees,
          eventType: b.eventType ? {
            id: b.eventType.id,
            title: b.eventType.title,
            slug: b.eventType.slug,
            length: b.eventType.length,
            price: b.eventType.price,
            currency: b.eventType.currency,
            schedulingType: (b.eventType as any).schedulingType,
          } : undefined,
          paid: b.paid,
          bookingFieldLabels,
        };

        // If Cal.id confirms payment, use the event type price as the amount
        const paidAmount = (b.paid === true && b.eventType?.price && b.eventType.price > 0)
          ? b.eventType.price / 100
          : undefined;

        transactionOps.push(
          prisma.booking.upsert({
            where: {
              cal_connection_id_cal_booking_id: {
                cal_connection_id: connection.id,
                cal_booking_id: bookingId
              }
            },
            update: {
              status: status as any,
              event_type_name: b.eventType?.title || b.title || undefined,
              attendee_name: b.responses?.name || b.attendees?.[0]?.name || undefined,
              attendee_email: b.responses?.email || b.attendees?.[0]?.email || undefined,
              start_time: b.startTime ? new Date(b.startTime) : undefined,
              end_time: b.endTime ? new Date(b.endTime) : undefined,
              updated_at: b.updatedAt ? new Date(b.updatedAt) : new Date(),
              metadata,
              // Only set amount if Cal.id confirms payment — preserves manually entered amounts
              ...(paidAmount !== undefined ? { amount: paidAmount } : {}),
            },
            create: {
              tenant_id: connection.tenant_id,
              cal_connection_id: connection.id,
              cal_booking_id: bookingId,
              event_type_id: etId || "unknown",
              event_type_name: b.eventType?.title || b.title || "Meeting",
              host_name: b.user?.name || b.userPrimaryEmail || "Host",
              host_email: b.user?.email || b.userPrimaryEmail || "",
              attendee_name: b.responses?.name || b.attendees?.[0]?.name || "Attendee",
              attendee_email: b.responses?.email || b.attendees?.[0]?.email || "",
              status: status as any,
              start_time: b.startTime ? new Date(b.startTime) : new Date(),
              end_time: b.endTime ? new Date(b.endTime) : new Date(),
              created_at: b.createdAt ? new Date(b.createdAt) : new Date(),
              updated_at: b.updatedAt ? new Date(b.updatedAt) : new Date(),
              metadata,
              ...(paidAmount !== undefined ? { amount: paidAmount } : {}),
            }
          })
        );
        totalSynced++;
      }

      // Execute batch query for these 50 bookings
      if (transactionOps.length > 0) {
        await prisma.$transaction(transactionOps);
      }
    }

    // Update last_synced_at
    await prisma.calConnection.update({
      where: { id: connection.id },
      data: { last_synced_at: new Date() }
    });

    // ─── Fetch field labels in background (non-blocking) ─────
    // Only re-fetch labels if stale (>30 min) to avoid slowing every sync
    if (apiKey.startsWith("calid_") && labelsStale) {
      // Fire and forget — don't await
      (async () => {
        try {
          const profileSlug = await discoverProfileSlug(client);
          if (!profileSlug) return;

          const eventTypes = await client.getEventTypes();
          const newLabelsMap: Record<string, Record<string, string>> = {};

          for (const et of eventTypes) {
            try {
              const fields = await fetchBookingFieldLabels(profileSlug, et.slug);
              if (fields.length > 0) {
                const labelMap: Record<string, string> = {};
                for (const f of fields) {
                  labelMap[f.name] = f.label;
                }
                newLabelsMap[et.id.toString()] = labelMap;
              }
            } catch { }
          }

          if (Object.keys(newLabelsMap).length > 0) {
            // Save labels to connection metadata for future syncs
            await prisma.calConnection.update({
              where: { id: connection.id },
              data: {
                metadata: {
                  ...connMeta,
                  fieldLabelsMap: newLabelsMap,
                  labelsLastFetched: Date.now(),
                },
              },
            });

            // Update existing bookings with new labels
            const allBookings = await prisma.booking.findMany({
              where: { cal_connection_id: connection.id },
              select: { id: true, event_type_id: true, metadata: true },
            });
            for (const bk of allBookings) {
              const labels = newLabelsMap[bk.event_type_id || ""] || {};
              if (Object.keys(labels).length > 0) {
                await prisma.booking.update({
                  where: { id: bk.id },
                  data: {
                    metadata: {
                      ...((bk.metadata as any) || {}),
                      bookingFieldLabels: labels,
                    },
                  },
                });
              }
            }
          }
        } catch (e) {
          console.error("Background label fetch failed:", e);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${totalSynced} bookings`
    });

  } catch (err) {
    console.error("Sync failed:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
