import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, description, rules } = body;

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const audience = await prisma.audience.create({
            data: {
                tenant_id: session.user.tenant_id,
                name,
                description,
                rules: rules || {}
            }
        });

        return NextResponse.json({ success: true, audience });
    } catch (err) {
        console.error("Error creating audience:", err);
        return NextResponse.json({ error: "Failed to create audience" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const audiences = await prisma.audience.findMany({
            where: { tenant_id: session.user.tenant_id },
            orderBy: { updated_at: "desc" }
        });

        return NextResponse.json({ audiences });
    } catch (err) {
        console.error("Error fetching audiences:", err);
        return NextResponse.json({ error: "Failed to fetch audiences" }, { status: 500 });
    }
}
