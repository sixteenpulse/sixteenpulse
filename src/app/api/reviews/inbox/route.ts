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

        const feedback = await prisma.internalFeedback.findMany({
            where: { tenant_id: tenantId },
            orderBy: { created_at: "desc" },
            include: {
                client: { select: { id: true, name: true, email: true, phone: true } },
                booking: { select: { id: true, start_time: true, event_type_name: true } }
            }
        });

        return NextResponse.json(feedback);
    } catch (err) {
        console.error("Error fetching inbox:", err);
        return NextResponse.json({ error: "Failed to fetch inbox" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { feedbackId, resolved } = body;

        if (!feedbackId || typeof resolved !== "boolean") {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        // Must ensure the feedback belongs to the current tenant
        const existing = await prisma.internalFeedback.findFirst({
            where: { id: feedbackId, tenant_id: session.user.tenant_id }
        });

        if (!existing) {
            return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
        }

        const updated = await prisma.internalFeedback.update({
            where: { id: feedbackId },
            data: { resolved }
        });

        return NextResponse.json(updated);
    } catch (err) {
        console.error("Error updating inbox feedback:", err);
        return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 });
    }
}
