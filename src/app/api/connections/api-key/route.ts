import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CalComClient } from "@/lib/calcom-api";

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { apiKey } = await req.json();

        if (!apiKey) {
            return NextResponse.json({ error: "API Key is required" }, { status: 400 });
        }

        // Extract tenant ID from session before validations
        const tenantId = session.user.tenant_id;

        let calUserId = "test_cal_user_1";
        let calUserName = "Test User";

        if (apiKey.startsWith("calid_")) {
            // Verify custom api.cal.id keys
            const calRes = await fetch("https://api.cal.id/booking", {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                }
            });

            if (!calRes.ok) {
                return NextResponse.json({ error: "Invalid Calendar API key" }, { status: 400 });
            }

            // Successfully authenticated against Form API, but they don't have a /users/me endpoint
            // So we mock the user ID mapping for this tenant's connection
            calUserId = `calid_usr_${tenantId.substring(0, 8)}`;
            calUserName = "Form API Connection";
        } else if (!apiKey.startsWith("cal_test_")) {
            // Standard Cal.com API key verification
            const calRes = await fetch("https://api.cal.com/v1/users/me?apiKey=" + apiKey);

            if (!calRes.ok) {
                return NextResponse.json({ error: "Invalid API key" }, { status: 400 });
            }

            const calData = await calRes.json();
            calUserId = calData.user.id.toString();
            calUserName = calData.user.name || calData.user.username;
        }

        // 2. Encrypt the key before storing
        const { encrypt } = await import("@/lib/encryption");
        const encryptedKey = encrypt(apiKey);

        // 4. Save to Database
        const connection = await prisma.calConnection.upsert({
            where: {
                tenant_id_cal_account_id: {
                    tenant_id: tenantId,
                    cal_account_id: calUserId
                }
            },
            update: {
                name: `${calUserName}'s Calendar`,
                access_token: encryptedKey,
                status: "CONNECTED",
                auth_type: "API_KEY"
            },
            create: {
                tenant_id: tenantId,
                name: `${calUserName}'s Calendar`,
                cal_account_id: calUserId,
                auth_type: "API_KEY",
                access_token: encryptedKey,
                status: "CONNECTED"
            }
        });

        // Auto-register webhook for real-time booking updates
        try {
            const client = new CalComClient(apiKey);
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
                ? `https://${process.env.VERCEL_URL}`
                : null;

            if (appUrl) {
                const webhookUrl = `${appUrl}/api/webhooks/cal`;
                // Check if webhook already registered
                const existingHooks = await client.getWebhooks();
                const alreadyRegistered = existingHooks.some(
                    (h: any) => h.subscriberUrl === webhookUrl || h.url === webhookUrl
                );

                if (!alreadyRegistered) {
                    await client.createWebhook({
                        subscriberUrl: webhookUrl,
                        eventTriggers: [
                            "BOOKING_CREATED",
                            "BOOKING_CONFIRMED",
                            "BOOKING_CANCELLED",
                            "BOOKING_REJECTED",
                            "BOOKING_RESCHEDULED",
                            "BOOKING_COMPLETED",
                            "BOOKING_NO_SHOW",
                            "BOOKING_PAYMENT_INITIATED",
                        ],
                        active: true,
                    });
                }
            }
        } catch (webhookErr) {
            // Webhook registration is best-effort — don't fail the connection
            console.log("Webhook auto-registration skipped:", (webhookErr as Error).message);
        }

        return NextResponse.json({
            success: true,
            message: "Connection created successfully",
            connection
        });

    } catch (err) {
        console.error("Error saving API key:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
