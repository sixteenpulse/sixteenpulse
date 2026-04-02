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
        const schedule = await client.updateSchedule(parseInt(id), body);
        return NextResponse.json({ schedule });
    } catch (err) {
        console.error("Error updating schedule:", err);
        return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
    }
}

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

        await client.deleteSchedule(parseInt(id));
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Error deleting schedule:", err);
        return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 });
    }
}
