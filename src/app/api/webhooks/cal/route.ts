import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/webhooks/cal — webhook verification ping
 */
export async function GET() {
    return NextResponse.json({ ok: true });
}

/**
 * POST /api/webhooks/cal
 * Handles Cal.id webhook events (direct from Cal.id API or via N8N).
 * Supports: BOOKING_CREATED, BOOKING_CONFIRMED, BOOKING_CANCELLED,
 *           BOOKING_REJECTED, BOOKING_RESCHEDULED, BOOKING_COMPLETED,
 *           BOOKING_NO_SHOW, BOOKING_PAYMENT_INITIATED
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Cal.id may send payload nested or at top level
        const triggerEvent = body.triggerEvent || body.trigger || body.event;
        const payload = body.payload || body;

        if (!triggerEvent) {
            return NextResponse.json({ received: true });
        }

        const connection = await prisma.calConnection.findFirst({
            where: { status: "CONNECTED" },
        });

        if (!connection) {
            console.warn("Webhook: no connected integration found");
            return NextResponse.json({ received: true });
        }

        // Cal.id uses numeric bookingId; sync stores by numeric ID
        const numericId = payload.bookingId?.toString() || "";
        const uid = payload.uid || "";
        const calBookingId = numericId || uid;

        if (!calBookingId) {
            return NextResponse.json({ received: true });
        }

        // Map webhook event to status
        let status = "OTHER";
        switch (triggerEvent) {
            case "BOOKING_CREATED":
            case "BOOKING_CONFIRMED":
                status = "SCHEDULED";
                break;
            case "BOOKING_CANCELLED":
            case "BOOKING_REJECTED":
                status = "CANCELLED";
                break;
            case "BOOKING_RESCHEDULED":
                status = "RESCHEDULED";
                break;
            case "BOOKING_COMPLETED":
            case "BOOKING_NO_SHOW":
                status = "COMPLETED";
                break;
            case "BOOKING_PAYMENT_INITIATED":
                break;
        }

        // Build metadata from webhook payload (same structure as sync)
        const metadata: any = {
            uid,
            numericId,
            description: payload.description || "",
            location: payload.location || payload.responses?.location?.optionValue || "",
            responses: payload.responses || {},
            attendees: payload.attendees || [],
            eventType: payload.eventType ? {
                id: payload.eventType.id,
                title: payload.eventType.title,
                slug: payload.eventType.slug,
                length: payload.eventType.length,
                price: payload.eventType.price,
                currency: payload.eventType.currency,
            } : undefined,
            paid: payload.paid || false,
        };

        const attendeeName = payload.responses?.name || payload.attendees?.[0]?.name || "Attendee";
        const attendeeEmail = payload.responses?.email || payload.attendees?.[0]?.email || "";

        const paidAmount = (payload.paid === true && payload.eventType?.price > 0)
            ? payload.eventType.price / 100
            : undefined;

        // Try to find existing booking — by numeric ID first, then UID
        let existingBooking = null;
        if (numericId) {
            existingBooking = await prisma.booking.findUnique({
                where: {
                    cal_connection_id_cal_booking_id: {
                        cal_connection_id: connection.id,
                        cal_booking_id: numericId,
                    },
                },
                select: { id: true },
            });
        }
        if (!existingBooking && uid && uid !== numericId) {
            existingBooking = await prisma.booking.findUnique({
                where: {
                    cal_connection_id_cal_booking_id: {
                        cal_connection_id: connection.id,
                        cal_booking_id: uid,
                    },
                },
                select: { id: true },
            });
        }

        if (existingBooking) {
            await prisma.booking.update({
                where: { id: existingBooking.id },
                data: {
                    status: status as any,
                    attendee_name: attendeeName,
                    attendee_email: attendeeEmail || undefined,
                    start_time: payload.startTime ? new Date(payload.startTime) : undefined,
                    end_time: payload.endTime ? new Date(payload.endTime) : undefined,
                    updated_at: new Date(),
                    metadata,
                    ...(paidAmount !== undefined ? { amount: paidAmount } : {}),
                },
            });
        } else {
            await prisma.booking.create({
                data: {
                    tenant_id: connection.tenant_id,
                    cal_connection_id: connection.id,
                    cal_booking_id: calBookingId,
                    event_type_id: payload.eventTypeId?.toString() || payload.eventType?.id?.toString() || "unknown",
                    event_type_name: payload.title || payload.eventType?.title || payload.type || "Meeting",
                    host_name: payload.organizer?.name || "",
                    host_email: payload.organizer?.email || "",
                    attendee_name: attendeeName,
                    attendee_email: attendeeEmail,
                    status: status as any,
                    start_time: payload.startTime ? new Date(payload.startTime) : new Date(),
                    end_time: payload.endTime ? new Date(payload.endTime) : new Date(),
                    created_at: new Date(),
                    updated_at: new Date(),
                    metadata,
                    ...(paidAmount !== undefined ? { amount: paidAmount } : {}),
                },
            });

            // Import dynamically to avoid top-level issues if env vars are missing during build
            const { sendPushToTenant } = await import("@/lib/push-notify");
            await sendPushToTenant(connection.tenant_id, {
                title: "New Booking!",
                body: `${attendeeName} just booked ${payload.title || payload.eventType?.title || "a Meeting"}!`,
                url: "/bookings",
            });
        }

        return NextResponse.json({ received: true, processed: triggerEvent, bookingId: calBookingId });
    } catch (err) {
        console.error("Webhook error:", err);
        return NextResponse.json({ received: true, error: "Processing failed" }, { status: 200 });
    }
}
