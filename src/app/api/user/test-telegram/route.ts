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

        if (!tenant?.telegram_bot_token) {
            return NextResponse.json({ error: "Workspace Bot Token is missing" }, { status: 400 });
        }

        if (!user?.telegram_chat_id) {
            return NextResponse.json({ error: "Your Chat ID is missing" }, { status: 400 });
        }

        const tgToken = tenant.telegram_bot_token.trim();
        const chatId = user.telegram_chat_id.trim();
        
        const message = "✅ *Success!*\n\nYour Telegram integration is working perfectly. You will now receive instant notifications for all new bookings!";
        const url = `https://api.telegram.org/bot${tgToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}&parse_mode=Markdown`;

        const res = await fetch(url);
        const data = await res.json();

        if (!data.ok) {
            return NextResponse.json({ error: data.description || "Failed to send message" }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Test Telegram Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
