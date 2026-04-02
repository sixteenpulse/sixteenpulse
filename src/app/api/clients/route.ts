import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// GET /api/clients
export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q") || "";

        const where: any = { tenant_id: session.user.tenant_id };
        if (q) {
            where.OR = [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
            ];
        }

        const clients = await prisma.client.findMany({
            where,
            orderBy: { updated_at: "desc" },
            include: { clientNotes: { orderBy: { created_at: "desc" }, take: 5 } }
        });

        return NextResponse.json({ clients });
    } catch (err) {
        console.error("Error fetching clients:", err);
        return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
    }
}

// POST /api/clients
export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, email, phone, notes, tags } = body;

        if (!name || !email) {
            return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
        }

        const client = await prisma.client.upsert({
            where: {
                tenant_id_email: {
                    tenant_id: session.user.tenant_id,
                    email
                }
            },
            update: { name, phone, notes, tags },
            create: {
                tenant_id: session.user.tenant_id,
                name,
                email,
                phone,
                notes,
                tags: tags || [],
            }
        });

        return NextResponse.json({ client });
    } catch (err) {
        console.error("Error creating client:", err);
        return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
    }
}
