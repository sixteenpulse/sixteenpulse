import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ tenantId: string }> }
) {
    try {
        const { tenantId } = await params;
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                name: true,
                google_review_link: true
            }
        });

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        // We only expose non-sensitive public data needed for the feedback page
        return NextResponse.json({
            name: tenant.name,
            google_review_link: tenant.google_review_link
        });

    } catch (err) {
        console.error("Error fetching public tenant info:", err);
        return NextResponse.json({ error: "Failed to fetch info" }, { status: 500 });
    }
}
