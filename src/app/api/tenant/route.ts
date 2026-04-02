import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: session.user.tenant_id },
            include: { calConnections: true }
        });

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        return NextResponse.json({ tenant });
    } catch (err) {
        console.error("Error fetching tenant details:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        // Allowed fields to update
        const dataToUpdate: any = {};
        if (body.name !== undefined) dataToUpdate.name = body.name;
        if (body.slug !== undefined) dataToUpdate.slug = body.slug;
        if (body.logo_url !== undefined) dataToUpdate.logo_url = body.logo_url;

        // Check for slug uniqueness if it's being updated
        if (dataToUpdate.slug) {
            const existing = await prisma.tenant.findUnique({ where: { slug: dataToUpdate.slug } });
            if (existing && existing.id !== session.user.tenant_id) {
                return NextResponse.json({ error: "Slug is already taken" }, { status: 400 });
            }
        }

        const tenant = await prisma.tenant.update({
            where: { id: session.user.tenant_id },
            data: dataToUpdate
        });

        return NextResponse.json({ success: true, tenant });
    } catch (err) {
        console.error("Error updating tenant details:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        // Save selectedEventTypes to the first CalConnection's metadata
        if (body.selectedEventTypes) {
            const connection = await prisma.calConnection.findFirst({
                where: { tenant_id: session.user.tenant_id, status: "CONNECTED" },
            });

            if (connection) {
                const existingMetadata = (connection.metadata as any) || {};
                await prisma.calConnection.update({
                    where: { id: connection.id },
                    data: {
                        metadata: {
                            ...existingMetadata,
                            selectedEventTypes: body.selectedEventTypes,
                        },
                    },
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Error saving filter:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
