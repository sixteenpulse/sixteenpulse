import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic"; // Ensure it's not statically cached

export async function GET(req: Request) {
    try {
        // A lightweight database query to keep the Neon connection active
        await prisma.$queryRaw`SELECT 1`;

        return NextResponse.json({
            status: "alive",
            timestamp: new Date().toISOString()
        }, { status: 200 });
    } catch (error) {
        console.error("Keepalive ping failed:", error);
        return NextResponse.json({ error: "Database unreachable" }, { status: 500 });
    }
}
