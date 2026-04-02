import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";

export async function POST(req: Request) {
    try {
        const { email, password, rememberMe } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            include: { tenant: true }
        });

        if (!user) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        const isValid = await compare(password, user.password_hash);
        if (!isValid) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        // Configure session lifetime based on "Remember Me" toggle
        // 30 days = 60 * 60 * 24 * 30 = 2592000 seconds
        const loginOptions = {
            ...sessionOptions,
            cookieOptions: {
                ...sessionOptions.cookieOptions,
                maxAge: rememberMe ? 2592000 : undefined,
            }
        };

        // Set session
        const session = await getIronSession<SessionData>(await cookies(), loginOptions);
        session.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as "ADMIN" | "MEMBER",
            tenant_id: user.tenant_id
        };
        await session.save();

        return NextResponse.json({ success: true, redirect: "/" });

    } catch (error: any) {
        console.error("Login error:", error);
        return NextResponse.json({ error: "Failed to log in" }, { status: 500 });
    }
}
