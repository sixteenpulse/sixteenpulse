import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// Ensure keys exist before setting them 
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        "mailto:hello@16pulse.com",
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

export async function sendPushToTenant(tenantId: string, payload: { title: string; body: string; url?: string }) {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        console.warn("VAPID keys are missing. Push notification aborted.");
        return;
    }

    try {
        // Find all subscriptions for all users under this tenant
        const users = await prisma.user.findMany({
            where: { tenant_id: tenantId },
            include: { pushSubscriptions: true }
        });

        const subscriptions = users.flatMap(u => u.pushSubscriptions);

        const pushPayload = JSON.stringify(payload);

        // Broadcast notification to all registered devices matching this tenant
        const promises = subscriptions.map((sub) =>
            webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: {
                        auth: sub.auth,
                        p256dh: sub.p256dh,
                    },
                },
                pushPayload
            ).catch(err => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    // Subscription has expired or is no longer valid, delete it
                    return prisma.pushSubscription.delete({ where: { id: sub.id } });
                }
                console.error("Failed sending to one subscription", err);
            })
        );

        await Promise.all(promises);
    } catch (error) {
        console.error("Error broadcasting push notification:", error);
    }
}
