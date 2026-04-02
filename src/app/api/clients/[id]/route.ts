import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// GET /api/clients/[id]
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

        const client = await prisma.client.findFirst({
            where: { id, tenant_id: session.user.tenant_id },
            include: {
                clientNotes: {
                    orderBy: { created_at: "desc" }
                }
            }
        });

        if (!client) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        // Also get bookings for this client
        const bookings = await prisma.booking.findMany({
            where: {
                tenant_id: session.user.tenant_id,
                attendee_email: client.email
            },
            orderBy: { start_time: "desc" },
            take: 20
        });

        return NextResponse.json({ client, bookings });
    } catch (err) {
        console.error("Error fetching client:", err);
        return NextResponse.json({ error: "Failed to fetch client" }, { status: 500 });
    }
}

// PATCH /api/clients/[id]
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

        const existingClient = await prisma.client.findFirst({
            where: { id, tenant_id: session.user.tenant_id }
        });

        if (!existingClient) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        // Handle adding notes
        if (body.addNote) {
            const note = await prisma.clientNote.create({
                data: {
                    client_id: id,
                    content: body.addNote,
                    created_by: session.user.id
                }
            });
            return NextResponse.json({ note });
        }

        const { name, phone, notes, tags } = body;
        const client = await prisma.client.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(phone !== undefined && { phone }),
                ...(notes !== undefined && { notes }),
                ...(tags && { tags }),
            }
        });

        return NextResponse.json({ client });
    } catch (err) {
        console.error("Error updating client:", err);
        return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
    }
}

// DELETE /api/clients/[id]
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

        const existingClient = await prisma.client.findFirst({
            where: { id, tenant_id: session.user.tenant_id }
        });

        if (!existingClient) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        // Delete notes first, then client
        await prisma.clientNote.deleteMany({ where: { client_id: id } });
        await prisma.client.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Error deleting client:", err);
        return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
    }
}
