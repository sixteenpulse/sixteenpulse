import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/debug-telegram
 * Steps through the exact same logic as the webhook to find where Telegram fails.
 */
export async function GET() {
    const debug: any = { steps: [] };

    try {
        const session = await getSession();
        if (!session?.user?.id || !session?.user?.tenant_id) {
            return NextResponse.json({ error: "Not logged in" }, { status: 401 });
        }

        debug.steps.push({ step: "1. Session", tenantId: session.user.tenant_id, userId: session.user.id });

        // Step 2: Find all connections for this tenant
        const connections = await prisma.calConnection.findMany({
            where: { tenant_id: session.user.tenant_id },
            include: { tenant: true }
        });

        debug.steps.push({
            step: "2. Connections",
            count: connections.length,
            connections: connections.map(c => ({
                id: c.id,
                calAccountId: c.cal_account_id,
                status: c.status,
                tenantName: c.tenant.name,
                hasBotToken: !!c.tenant.telegram_bot_token,
                botTokenPreview: c.tenant.telegram_bot_token ? c.tenant.telegram_bot_token.substring(0, 10) + "..." : null
            }))
        });

        // Step 3: Check tenant bot token
        const tenant = await prisma.tenant.findUnique({
            where: { id: session.user.tenant_id }
        });

        debug.steps.push({
            step: "3. Tenant",
            name: tenant?.name,
            hasBotToken: !!tenant?.telegram_bot_token,
            botTokenLength: tenant?.telegram_bot_token?.length || 0
        });

        // Step 4: Check users with chat IDs
        const usersWithTg = await prisma.user.findMany({
            where: {
                tenant_id: session.user.tenant_id,
                telegram_chat_id: { not: null }
            },
            select: { id: true, email: true, telegram_chat_id: true }
        });

        debug.steps.push({
            step: "4. Users with Telegram Chat ID",
            count: usersWithTg.length,
            users: usersWithTg.map(u => ({
                email: u.email,
                chatId: u.telegram_chat_id
            }))
        });

        // Step 5: Try sending a test message
        if (tenant?.telegram_bot_token && usersWithTg.length > 0) {
            const tgToken = tenant.telegram_bot_token.trim();
            const chatId = usersWithTg[0].telegram_chat_id!.trim();

            const message = `🔧 <b>DEBUG TEST</b>\n\nThis confirms your webhook Telegram path is working correctly.`;

            const tgUrl = `https://api.telegram.org/bot${tgToken}/sendMessage`;

            // Use POST with JSON body instead of GET with query params (more reliable)
            const tgRes = await fetch(tgUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: "HTML"
                })
            });

            const tgData = await tgRes.json();

            debug.steps.push({
                step: "5. Telegram API Response",
                httpStatus: tgRes.status,
                ok: tgData.ok,
                description: tgData.description || null,
                messageId: tgData.result?.message_id || null
            });
        } else {
            debug.steps.push({
                step: "5. Telegram SKIPPED",
                reason: !tenant?.telegram_bot_token ? "No bot token on tenant" : "No users with chat ID"
            });
        }

        // Step 6: Get the latest booking for this tenant
        const latestBooking = await prisma.booking.findFirst({
            where: { tenant_id: session.user.tenant_id },
            orderBy: { inserted_at: "desc" }
        });

        debug.steps.push({
            step: "6. Latest Booking",
            exists: !!latestBooking,
            attendee: latestBooking?.attendee_name,
            service: latestBooking?.event_type_name,
            insertedAt: latestBooking?.inserted_at,
            connectionId: latestBooking?.cal_connection_id
        });

        return NextResponse.json(debug);
    } catch (err: any) {
        debug.steps.push({ step: "ERROR", message: err.message, stack: err.stack?.substring(0, 500) });
        return NextResponse.json(debug, { status: 500 });
    }
}
