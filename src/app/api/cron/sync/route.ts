import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    // Basic auth using an authorization header or Vercel Cron secret
    const authHeader = req.headers.get("authorization");
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        // Fetch ALL connected accounts
        const connections = await prisma.calConnection.findMany({
            where: { status: "CONNECTED" },
            select: { id: true }
        });

        console.log(`Starting background sync for ${connections.length} connections.`);

        // Stagger requests: Process 5 at a time
        const BATCH_SIZE = 5;
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < connections.length; i += BATCH_SIZE) {
            const batch = connections.slice(i, i + BATCH_SIZE);
            
            await Promise.allSettled(
                batch.map(async (conn) => {
                    try {
                        // Call our own sync endpoint for each relative link
                        // Or import the sync logic directly. Since it relies on Request json, we mock it via internal POST:
                        const origin = new URL(req.url).origin;
                        const res = await fetch(`${origin}/api/sync`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ connectionId: conn.id })
                        });
                        if (res.ok) successCount++;
                        else failCount++;
                    } catch (err) {
                        failCount++;
                    }
                })
            );

            // Optional: wait a moment before processing the next batch to maintain connection pool limits
            if (i + BATCH_SIZE < connections.length) {
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        return NextResponse.json({
            message: "Cron sync complete",
            successCount,
            failCount,
            total: connections.length
        });
    } catch (error) {
        console.error("Cron sync error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
