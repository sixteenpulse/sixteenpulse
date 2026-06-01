import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, email: true, role: true, telegram_chat_id: true }
        });

        return NextResponse.json({ success: true, user });
    } catch (err) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        
        const dataToUpdate: any = {};
        if (body.name && body.name.trim().length > 0) {
            dataToUpdate.name = body.name.trim();
        }
        if (body.telegram_chat_id !== undefined) {
            dataToUpdate.telegram_chat_id = body.telegram_chat_id;
        }

        if (Object.keys(dataToUpdate).length > 0) {
            await prisma.user.update({
                where: { id: session.user.id },
                data: dataToUpdate
            });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
