import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { CalComClient } from "@/lib/calcom-api";


// GET /api/bookings - list all bookings for tenant
export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const q = searchParams.get("q") || "";
        const status = searchParams.get("status") || "";

        const where: any = { tenant_id: session.user.tenant_id };
        if (session.user.role === "MEMBER") {
            where.host_email = session.user.email;
        }

        if (q) {
            where.OR = [
                { attendee_name: { contains: q, mode: "insensitive" } },
                { attendee_email: { contains: q, mode: "insensitive" } },
                { event_type_name: { contains: q, mode: "insensitive" } },
            ];
        }

        if (status) {
            where.status = status;
        }

        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                orderBy: { start_time: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.booking.count({ where }),
        ]);

        return NextResponse.json({
            bookings,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (err) {
        console.error("Error fetching bookings:", err);
        return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
    }
}

// POST /api/bookings - create a new booking
export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { eventTypeId, start, end, name, email } = body;

        if (!eventTypeId || !start || !name || !email) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Get connection
        const connection = await prisma.calConnection.findFirst({
            where: { tenant_id: session.user.tenant_id, status: "CONNECTED" }
        });

        if (!connection) {
            return NextResponse.json({ error: "No active connection" }, { status: 404 });
        }

        const apiKey = decrypt(connection.access_token);
        const client = new CalComClient(apiKey);

        // Create booking via Cal.id API
        let calBooking;
        try {
            calBooking = await client.createBooking({
                eventTypeId: parseInt(eventTypeId),
                start,
                end,
                name,
                email,
            });
        } catch (e: any) {
            console.error("Cal API booking creation failed:", e);
            // Still create locally if API fails
        }

        // Use numeric ID for Cal.id API compatibility (consistent with sync)
        const bookingId = calBooking?.id?.toString() || calBooking?.uid || `local_${Date.now()}`;

        // Save locally
        const booking = await prisma.booking.create({
            data: {
                tenant_id: session.user.tenant_id,
                cal_connection_id: connection.id,
                cal_booking_id: bookingId,
                event_type_id: eventTypeId.toString(),
                event_type_name: calBooking?.title || "Booking",
                host_name: session.user.name,
                host_email: session.user.email,
                attendee_name: name,
                attendee_email: email,
                status: "SCHEDULED",
                start_time: new Date(start),
                end_time: end ? new Date(end) : new Date(new Date(start).getTime() + 30 * 60000),
                created_at: new Date(),
                updated_at: new Date(),
            }
        });

        return NextResponse.json({ success: true, booking });
    } catch (err) {
        console.error("Error creating booking:", err);
        return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }
}
