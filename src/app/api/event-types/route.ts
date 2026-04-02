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

// GET /api/event-types
export async function GET() {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const client = await getClient(session.user.tenant_id);
        if (!client) {
            return NextResponse.json({ error: "No active connection" }, { status: 404 });
        }

        const eventTypes = await client.getEventTypes();
        return NextResponse.json({ eventTypes });
    } catch (err) {
        console.error("Error fetching event types:", err);
        return NextResponse.json({ error: "Failed to fetch event types" }, { status: 500 });
    }
}

// POST /api/event-types
export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const client = await getClient(session.user.tenant_id);
        if (!client) {
            return NextResponse.json({ error: "No active connection" }, { status: 404 });
        }

        const body = await req.json();
        const eventType = await client.createEventType(body);
        return NextResponse.json({ eventType });
    } catch (err) {
        console.error("Error creating event type:", err);
        return NextResponse.json({ error: "Failed to create event type" }, { status: 500 });
    }
}
