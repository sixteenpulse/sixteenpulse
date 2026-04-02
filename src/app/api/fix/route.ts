import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const result = await prisma.calConnection.updateMany({
            where: { name: { contains: 'Cal.id' } },
            data: { name: "Booking System Calendar" }
        });
        return NextResponse.json({ success: true, count: result.count });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
