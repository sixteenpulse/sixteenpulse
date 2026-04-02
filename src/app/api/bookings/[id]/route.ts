import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { CalComClient } from "@/lib/calcom-api";


// Helper to get cal client for a booking
async function getClientForBooking(bookingId: string, tenantId: string, role?: string, email?: string) {
    const where: any = { id: bookingId, tenant_id: tenantId };
    if (role === "MEMBER" && email) {
        where.host_email = email;
    }

    const booking = await prisma.booking.findFirst({
        where,
        include: { cal_connection: true }
    });

    if (!booking) return null;

    const apiKey = decrypt(booking.cal_connection.access_token);
    const client = new CalComClient(apiKey);
    return { booking, client };
}

// GET /api/bookings/[id] - get single booking with live Cal.id data
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const where: any = { id, tenant_id: session.user.tenant_id };
        if (session.user.role === "MEMBER") {
            where.host_email = session.user.email;
        }

        const booking = await prisma.booking.findFirst({
            where,
            include: { cal_connection: true }
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // Try to fetch live data from Cal.id for full details
        let calData = null;
        try {
            const apiKey = decrypt(booking.cal_connection.access_token);
            const client = new CalComClient(apiKey);
            calData = await client.getBooking(booking.cal_booking_id);
        } catch (e) {
            // Live fetch failed, just use local data
        }

        // Strip connection details before returning
        const { cal_connection, ...bookingData } = booking;

        // Include field labels from stored metadata
        const fieldLabels = (booking.metadata as any)?.bookingFieldLabels || {};

        return NextResponse.json({ booking: bookingData, calData, fieldLabels });
    } catch (err) {
        console.error("Error fetching booking:", err);
        return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
    }
}

// PATCH /api/bookings/[id] - update booking status
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
        const body = await req.json();
        const { action, status, reason, startTime, endTime, amount } = body;

        const result = await getClientForBooking(id, session.user.tenant_id, session.user.role, session.user.email);
        if (!result) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        const { booking, client } = result;

        // Handle amount-only update (no Cal API needed)
        if (amount !== undefined && !action && !status) {
            const updated = await prisma.booking.update({
                where: { id },
                data: { amount: amount === null || amount === "" ? null : parseFloat(amount) },
            });
            return NextResponse.json({ success: true, booking: updated });
        }

        // Handle different actions
        if (action === "cancel" || status === "CANCELLED") {
            try {
                await client.cancelBooking(booking.cal_booking_id, reason);
            } catch (e) {
                // If API fails, still update locally
                console.error("Cal API cancel failed:", e);
            }
            await prisma.booking.update({
                where: { id },
                data: { status: "CANCELLED" }
            });
        } else if (action === "complete" || status === "COMPLETED") {
            await prisma.booking.update({
                where: { id },
                data: { status: "COMPLETED" }
            });
        } else if (action === "noshow") {
            try {
                if (client["apiKey"].startsWith("calid_")) {
                    // For Cal.id, try to use the dedicated mark-no-show endpoint or cancel with a reason
                    try {
                        await (client as any).request(`/booking/${booking.cal_booking_id}/mark-no-show`, { method: "POST" });
                    } catch (e) {
                        // Fallback to update status if the endpoint doesn't exist
                        await client.updateBooking(booking.cal_booking_id, { status: "NOSHOW" });
                    }
                } else {
                    // For cal.com v1
                    await client.updateBooking(booking.cal_booking_id, { status: "NOSHOW" });
                }
            } catch (e) {
                console.error("Cal API no-show failed:", e);
            }
            await prisma.booking.update({
                where: { id },
                data: {
                    status: "COMPLETED", // A no-show is technically a completed booking in the past, just unattended
                    metadata: { ...(booking.metadata as any || {}), noShow: true }
                }
            });
        } else if (action === "confirm" || action === "accept") {
            try {
                await client.updateBooking(booking.cal_booking_id, { status: "ACCEPTED" });
            } catch (e) {
                console.error("Cal API confirm failed:", e);
            }
            await prisma.booking.update({
                where: { id },
                data: { status: "SCHEDULED" }
            });
        } else if (action === "reschedule" && startTime && endTime) {
            try {
                await client.updateBooking(booking.cal_booking_id, { startTime, endTime });
            } catch (e) {
                console.error("Cal API reschedule failed:", e);
            }
            await prisma.booking.update({
                where: { id },
                data: {
                    start_time: new Date(startTime),
                    end_time: new Date(endTime),
                    status: "RESCHEDULED"
                }
            });
        } else if (status) {
            await prisma.booking.update({
                where: { id },
                data: { status: status as any }
            });
        }

        const updated = await prisma.booking.findUnique({ where: { id } });
        return NextResponse.json({ success: true, booking: updated });
    } catch (err) {
        console.error("Error updating booking:", err);
        return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
    }
}

// DELETE /api/bookings/[id] - cancel booking
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
        const body = await req.json().catch(() => ({}));

        const result = await getClientForBooking(id, session.user.tenant_id, session.user.role, session.user.email);
        if (!result) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        const { booking, client } = result;

        try {
            await client.cancelBooking(booking.cal_booking_id, body.reason);
        } catch (e) {
            console.error("Cal API cancel failed:", e);
        }

        await prisma.booking.update({
            where: { id },
            data: { status: "CANCELLED" }
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Error canceling booking:", err);
        return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
    }
}
