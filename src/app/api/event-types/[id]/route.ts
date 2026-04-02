import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { CalComClient } from "@/lib/calcom-api";


async function getClient(tenantId: string) {
    const connection = await prisma.calConnection.findFirst({
        where: { tenant_id: tenantId, status: "CONNECTED" }
    });
    if (!connection) return null;
    const apiKey = decrypt(connection.access_token);
    return new CalComClient(apiKey);
}

// PATCH /api/event-types/[id]
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const client = await getClient(session.user.tenant_id);
        if (!client) {
            return NextResponse.json({ error: "No active connection" }, { status: 404 });
        }

        const body = await req.json();
        const eventType = await client.updateEventType(parseInt(id), body);
        return NextResponse.json({ eventType });
    } catch (err) {
        console.error("Error updating event type:", err);
        return NextResponse.json({ error: "Failed to update event type" }, { status: 500 });
    }
}

// DELETE /api/event-types/[id]
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const client = await getClient(session.user.tenant_id);
        if (!client) {
            return NextResponse.json({ error: "No active connection" }, { status: 404 });
        }

        await client.deleteEventType(parseInt(id));
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Error deleting event type:", err);
        return NextResponse.json({ error: "Failed to delete event type" }, { status: 500 });
    }
}
