import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { CalComClient } from "@/lib/calcom-api";

export async function GET() {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role === "MEMBER") {
            return NextResponse.json({ error: "Forbidden: Members cannot view organization live bookings" }, { status: 403 });
        }

        // Get the first active connection for this tenant
        const connection = await prisma.calConnection.findFirst({
            where: {
                tenant_id: session.user.tenant_id,
                status: "CONNECTED"
            }
        });

        if (!connection) {
            return NextResponse.json({ error: "No active connection found" }, { status: 404 });
        }

        const apiKey = decrypt(connection.access_token);
        const client = new CalComClient(apiKey);
        const bookings = await client.getBookings();

        return NextResponse.json({ bookings });
    } catch (error: any) {
        console.error("Live bookings API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
