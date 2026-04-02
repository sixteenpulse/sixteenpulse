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

        const schedules = await client.getSchedules();
        return NextResponse.json({ schedules });
    } catch (err) {
        console.error("Error fetching schedules:", err);
        return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 });
    }
}

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
        const schedule = await client.createSchedule(body);
        return NextResponse.json({ schedule });
    } catch (err) {
        console.error("Error creating schedule:", err);
        return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
    }
}
