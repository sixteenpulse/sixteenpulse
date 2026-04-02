import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { tenantId, bookingId, rating, message } = body;

        // Basic validation
        if (!tenantId || typeof rating !== "number" || rating < 1 || rating > 5) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        // We need to resolve the client ID based on the booking if possible.
        // If bookingId is provided, we can look up the client.
        // For the sake of this prototype, if we don't have a reliable client link, we'll try to find or create a generic one, 
        // or just link it to the booking. 
        // A robust system would pass a signed JWT token in the URL containing the exact client ID.

        let clientId = "unknown-client"; // Fallback
        if (bookingId) {
            const booking = await prisma.booking.findFirst({
                where: { id: bookingId, tenant_id: tenantId }
            });

            if (!booking) {
                return NextResponse.json({ error: "Invalid booking reference" }, { status: 400 });
            }

            const client = await prisma.client.findFirst({
                where: { tenant_id: tenantId, email: booking.attendee_email }
            });
            if (client) {
                clientId = client.id;
            }
        }

        // Save Private Feedback
        await prisma.internalFeedback.create({
            data: {
                tenant_id: tenantId,
                client_id: clientId,
                booking_id: bookingId || null,
                rating,
                message: message || ""
            }
        });

        // Also update the ReviewRequest if one exists to mark it as REVIEWED
        if (clientId !== "unknown-client") {
            await prisma.reviewRequest.updateMany({
                where: {
                    tenant_id: tenantId,
                    client_id: clientId
                },
                data: {
                    status: "REVIEWED"
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Error saving feedback:", err);
        return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
    }
}
