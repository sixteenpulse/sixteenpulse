import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
    try {
        const session = await getSession();
        if (!session?.user?.id || !session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: session.user.tenant_id },
            select: { telegram_bot_token: true }
        });

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { telegram_chat_id: true }
        });

        if (!tenant?.telegram_bot_token || !user?.telegram_chat_id) {
            return NextResponse.json({ error: "Missing Telegram credentials" }, { status: 400 });
        }

        // Find the most recent booking
        const latestBooking = await prisma.booking.findFirst({
            where: { tenant_id: session.user.tenant_id },
            orderBy: { created_at: "desc" }
        });

        if (!latestBooking) {
            return NextResponse.json({ error: "No previous bookings found to test with!" }, { status: 400 });
        }

        const tgToken = tenant.telegram_bot_token.trim();
        const chatId = user.telegram_chat_id.trim();
        
        const eventDate = latestBooking.start_time.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        const eventName = latestBooking.event_type_name || "a Meeting";
        const attendeeName = latestBooking.attendee_name || "Unknown";
        const attendeeEmail = latestBooking.attendee_email || "";

        let message = `📅 *TEST BOOKING RECEIVED!*\n\n`;
        message += `👤 *Client:* ${attendeeName}\n`;
        if (attendeeEmail) message += `✉️ *Email:* ${attendeeEmail}\n`;
        message += `🏷️ *Service:* ${eventName}\n`;
        message += `⏰ *Date:* ${eventDate}\n`;
        
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.sixteenpulse.com";
        message += `\n🔗 [View Booking Details](${appUrl}/bookings/${latestBooking.id})`;

        const url = `https://api.telegram.org/bot${tgToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}&parse_mode=Markdown`;

        const res = await fetch(url);
        const data = await res.json();

        if (!data.ok) {
            return NextResponse.json({ error: data.description || "Failed to send message" }, { status: 400 });
        }

        return NextResponse.json({ success: true, attendee: attendeeName });
    } catch (err) {
        console.error("Test Telegram Booking Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
