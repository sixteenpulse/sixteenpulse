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
      where: { id: connectionId },
      include: { tenant: true }
    });

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    const apiKey = decrypt(connection.access_token);
    const client = new CalComClient(apiKey);

    // Delta sync: If we have successfully synced in the past 7 days, only sync bookings starting 7 days ago
    const lastSynced = connection.last_synced_at;
    const isDelta = !!(lastSynced && (Date.now() - lastSynced.getTime() < 7 * 24 * 60 * 60 * 1000));
    const dateFrom = isDelta
      ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    console.log(`[Sync] connectionId=${connectionId} isDelta=${isDelta} dateFrom=${dateFrom}`);

    // Fetch bookings (fast) — this is the critical path
    const [activeBookings, cancelledBookings] = await Promise.all([
      client.getBookings(dateFrom ? { dateFrom } : undefined),
      client.getBookings(dateFrom ? { status: "cancelled", dateFrom } : { status: "cancelled" }),
    ]);
    const bookings = [...activeBookings, ...cancelledBookings];

    // ─── Use cached field labels, or fetch lazily ────────────
    const connMeta = (connection.metadata as any) || {};
    let fieldLabelsMap: Record<string, Record<string, string>> = connMeta.fieldLabelsMap || {};
    const labelsLastFetched = connMeta.labelsLastFetched || 0;
    const labelsStale = Date.now() - labelsLastFetched > 30 * 60 * 1000; // refresh every 30 min

    // ─── Sync bookings (fast path) ──────────────────────────
    let totalSynced = 0;
    let hasChanges = false;

    // Track new bookings for Telegram notifications
    const newBookingDetails: Array<{
      attendeeName: string;
      attendeeEmail: string;
      eventName: string;
      startTime: string | null;
    }> = [];

    // Fetch existing bookings to compare for changes
    const existingBookings = await prisma.booking.findMany({
      where: { cal_connection_id: connection.id },
      select: { cal_booking_id: true, status: true, updated_at: true }
    });
    const existingMap = new Map(existingBookings.map(b => [b.cal_booking_id, b]));

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

        // Check for changes
        const existing = existingMap.get(bookingId);
        let bookingChanged = false;
        if (!existing) {
            hasChanges = true; // New booking
            bookingChanged = true;

            // Only notify for future/current bookings (not old historical ones)
            const bookingEnd = b.endTime ? new Date(b.endTime) : null;
            if (!bookingEnd || bookingEnd > now) {
              newBookingDetails.push({
                attendeeName: b.responses?.name || b.attendees?.[0]?.name || "Attendee",
                attendeeEmail: b.responses?.email || b.attendees?.[0]?.email || "",
                eventName: b.eventType?.title || b.title || "Meeting",
                startTime: b.startTime || null,
              });
            }
        } else {
            const newDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            const oldDate = existing.updated_at.getTime();
            if (existing.status !== status || newDate > oldDate) {
                hasChanges = true; // Status or updatedAt changed
                bookingChanged = true;
            }
        }

        const etId = b.eventTypeId?.toString() || b.eventType?.id?.toString() || "";
        const bookingFieldLabels = fieldLabelsMap[etId] || {};

        // Migrate old UID-based records to numeric ID
        // Only run the migration if the old UID record actually exists in our DB
        if (uid && uid !== bookingId && existingMap.has(uid)) {
          transactionOps.push(
            prisma.booking.deleteMany({
              where: {
                cal_connection_id: connection.id,
                cal_booking_id: uid,
              }
            })
          );
          bookingChanged = true; // Force upsert if UID is migrated
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

        if (bookingChanged) {
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

    // ─── Send Telegram notifications for new bookings ───────
    if (newBookingDetails.length > 0 && connection.tenant?.telegram_bot_token) {
      try {
        const tgToken = connection.tenant.telegram_bot_token.trim();
        const tenantUsers = await prisma.user.findMany({
          where: {
            tenant_id: connection.tenant_id,
            telegram_chat_id: { not: null }
          },
          select: { telegram_chat_id: true }
        });

        if (tenantUsers.length > 0) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sixteen-pulse.vercel.app";

          for (const newBooking of newBookingDetails) {
            const eventDate = newBooking.startTime
              ? new Date(newBooking.startTime).toLocaleString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long',
                  day: 'numeric', hour: 'numeric', minute: '2-digit'
                })
              : "TBD";

            let message = `📅 <b>NEW BOOKING RECEIVED!</b>\n\n`;
            message += `👤 <b>Client:</b> ${newBooking.attendeeName}\n`;
            if (newBooking.attendeeEmail) message += `✉️ <b>Email:</b> ${newBooking.attendeeEmail}\n`;
            message += `🏷️ <b>Service:</b> ${newBooking.eventName}\n`;
            message += `⏰ <b>Date:</b> ${eventDate}\n`;
            message += `\n🔗 <a href="${appUrl}/bookings">View in Dashboard</a>`;

            for (const u of tenantUsers) {
              if (u.telegram_chat_id) {
                try {
                  const res = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      chat_id: u.telegram_chat_id.trim(),
                      text: message,
                      parse_mode: "HTML"
                    })
                  });
                  if (!res.ok) {
                    const errData = await res.text();
                    console.error("Telegram send error:", errData);
                  }
                } catch (tgErr) {
                  console.error("Telegram fetch error:", tgErr);
                }
              }
            }
          }
        }
      } catch (tgErr) {
        console.error("Telegram notification error in sync:", tgErr);
      }
    }

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
      updated: hasChanges,
      message: `Synced ${totalSynced} bookings`
    });

  } catch (err) {
    console.error("Sync failed:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
