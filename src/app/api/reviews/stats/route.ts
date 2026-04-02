import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tenantId = session.user.tenant_id;

        // Count Requests Sent
        const sentCount = await prisma.reviewRequest.count({
            where: { tenant_id: tenantId }
        });

        // Count Opened/Clicked/Reviewed
        const clickedCount = await prisma.reviewRequest.count({
            where: {
                tenant_id: tenantId,
                status: { in: ["CLICKED", "REVIEWED"] }
            }
        });

        // Count Total Private Feedback Intercepted
        const privateFeedbackCount = await prisma.internalFeedback.count({
            where: { tenant_id: tenantId }
        });

        return NextResponse.json({
            sent: sentCount,
            clicked: clickedCount,
            privateFeedback: privateFeedbackCount
        });

    } catch (err) {
        console.error("Error fetching review stats:", err);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
