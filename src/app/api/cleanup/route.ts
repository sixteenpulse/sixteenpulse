import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/cleanup
 * Deletes completed/cancelled bookings older than 90 days.
 * Called by Vercel Cron (weekly) to keep Supabase free tier under 500MB.
 * Protected by CRON_SECRET env var.
 */
export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const result = await prisma.booking.deleteMany({
        where: {
            status: { in: ["COMPLETED", "CANCELLED"] },
            end_time: { lt: cutoffDate },
        },
    });

    return NextResponse.json({
        deleted: result.count,
        cutoff: cutoffDate.toISOString(),
    });
}
