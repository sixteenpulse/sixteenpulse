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

        const urlObj = new URL(req.url);
        const connId = urlObj.searchParams.get("connId");
        const calUserId = payload.userId?.toString();
        
        let connection = null;
        
        // 1. Try to find by explicit connection ID in the webhook URL (New method)
        if (connId) {
            connection = await prisma.calConnection.findUnique({
                where: { id: connId },
                include: { tenant: true }
            });
        }
        
        // 2. Fallback to userId matching (Standard Cal.com)
        if (!connection && calUserId) {
            connection = await prisma.calConnection.findFirst({
                where: { cal_account_id: calUserId, status: "CONNECTED" },
                include: { tenant: true }
            });
        }

        // 3. Absolute fallback (Legacy)
        if (!connection) {
            connection = await prisma.calConnection.findFirst({
                where: { status: "CONNECTED" },
                orderBy: { created_at: "desc" },
                include: { tenant: true }
            });
        }

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

            // --- Telegram Notifications ---
            try {
                const tgToken = connection.tenant?.telegram_bot_token;
                if (tgToken) {
                    const tenantUsers = await prisma.user.findMany({
                        where: { 
                            tenant_id: connection.tenant_id, 
                            telegram_chat_id: { not: null }
                        },
                        select: { telegram_chat_id: true }
                    });

                    if (tenantUsers.length > 0) {
                        const eventDate = payload.startTime ? new Date(payload.startTime).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : "TBD";
                        const eventName = payload.title || payload.eventType?.title || "a Meeting";
                        
                        let message = `📅 <b>NEW BOOKING RECEIVED!</b>\n\n`;
                        message += `👤 <b>Client:</b> ${attendeeName}\n`;
                        if (attendeeEmail) message += `✉️ <b>Email:</b> ${attendeeEmail}\n`;
                        message += `🏷️ <b>Service:</b> ${eventName}\n`;
                        message += `⏰ <b>Date:</b> ${eventDate}\n`;

                        // We just created the booking, but we need its ID.
                        // We can fetch it or just link to the main bookings page if we don't have the ID handy.
                        // Actually, we just ran prisma.booking.create, so let's link to the bookings dashboard.
                        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sixteen-pulse.vercel.app";
                        message += `\n🔗 <a href="${appUrl}/bookings">View in Dashboard</a>`;

                        const encodedMessage = encodeURIComponent(message);

                        await Promise.all(tenantUsers.map(async (u) => {
                            if (u.telegram_chat_id) {
                                const url = `https://api.telegram.org/bot${tgToken.trim()}/sendMessage?chat_id=${u.telegram_chat_id.trim()}&text=${encodedMessage}&parse_mode=HTML`;
                                const res = await fetch(url);
                                if (!res.ok) {
                                    const errText = await res.text();
                                    console.error("Telegram API Error:", errText);
                                }
                            }
                        }));
                    }
                }
            } catch (tgErr) {
                console.error("Telegram notification error:", tgErr);
            }
        }

        return NextResponse.json({ received: true, processed: triggerEvent, bookingId: calBookingId });
    } catch (err) {
        console.error("Webhook error:", err);
        return NextResponse.json({ received: true, error: "Processing failed" }, { status: 200 });
    }
}
