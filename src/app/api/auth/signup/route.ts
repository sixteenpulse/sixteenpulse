import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";

export async function POST(req: Request) {
    try {
        const { firstName, lastName, email, businessName, password } = await req.json();

        if (!firstName || !email || !businessName || !password) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
        }

        const hashedPassword = await hash(password, 10);
        const name = `${firstName} ${lastName}`.trim();
        const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        // Create Tenant and Admin User in a transaction
        const result = await prisma.$transaction(async (tx: any) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: businessName,
                    slug: slug + '-' + Math.random().toString(36).substring(2, 6) // simple slug uniqueness
                }
            });

            const user = await tx.user.create({
                data: {
                    email,
                    name,
                    password_hash: hashedPassword,
                    role: "ADMIN",
                    tenant_id: tenant.id
                }
            });

            return { tenant, user };
        });

        // Set session
        const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
        session.user = {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
            tenant_id: result.tenant.id
        };
        await session.save();

        return NextResponse.json({ success: true, redirect: "/" });

    } catch (error: any) {
        console.error("Signup error:", error);
        return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }
}
