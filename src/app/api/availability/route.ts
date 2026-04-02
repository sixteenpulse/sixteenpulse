import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { CalComClient } from "@/lib/calcom-api";

// GET /api/availability?eventTypeId=X&dateFrom=Y&dateTo=Z
export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }


        const { searchParams } = new URL(req.url);
        const eventTypeId = searchParams.get("eventTypeId");
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");
        const timeZone = searchParams.get("timeZone") || Intl.DateTimeFormat().resolvedOptions().timeZone;

        if (!eventTypeId || !dateFrom || !dateTo) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const connection = await prisma.calConnection.findFirst({
            where: { tenant_id: session.user.tenant_id, status: "CONNECTED" }
        });

        if (!connection) {
            return NextResponse.json({ error: "No active calendar connection" }, { status: 404 });
        }

        const apiKey = decrypt(connection.access_token);
        const client = new CalComClient(apiKey);

        const availability = await client.getAvailability({
            eventTypeId: parseInt(eventTypeId),
            dateFrom,
            dateTo,
            timeZone,
        });

        return NextResponse.json({ availability });
    } catch (err) {
        console.error("Error fetching availability:", err);
        return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
    }
}
