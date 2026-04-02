import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const tenants = await prisma.tenant.findMany();
        let createdCount = 0;

        for (const t of tenants) {
            const exists = await prisma.audience.findFirst({
                where: { tenant_id: t.id, name: "All Clients" }
            });
            if (!exists) {
                await prisma.audience.create({
                    data: {
                        tenant_id: t.id,
                        name: "All Clients",
                        description: "Automatically includes every client in your database",
                        rules: {}
                    }
                });
                createdCount++;
            }
        }

        return NextResponse.json({ success: true, message: `Created ${createdCount} default audiences.` });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
