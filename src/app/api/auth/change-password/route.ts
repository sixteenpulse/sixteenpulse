import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compare, hash } from "bcryptjs";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";

export async function POST(req: Request) {
    try {
        const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
        
        if (!session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: "New password must be at least 8 characters long." }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found." }, { status: 404 });
        }

        // Verify current password
        const isMatch = await compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return NextResponse.json({ error: "Incorrect current password." }, { status: 400 });
        }

        // Hash new password
        const password_hash = await hash(newPassword, 10);

        // Update database
        await prisma.user.update({
            where: { id: user.id },
            data: { password_hash },
        });

        return NextResponse.json({ success: true, message: "Password updated successfully!" });

    } catch (error: any) {
        console.error("Change password error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
