import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import nodemailer from "nodemailer";

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const config = await prisma.smtpConfig.findUnique({
            where: { tenant_id: session.user.tenant_id }
        });

        if (!config) {
            return NextResponse.json({ config: null });
        }

        return NextResponse.json({
            config: {
                host: config.host,
                port: config.port,
                secure: config.secure,
                user: config.user,
                // Don't expose the encrypted password
                hasPassword: !!config.password
            }
        });
    } catch (err) {
        console.error("Error fetching SMTP config:", err);
        return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { host, port, secure, user, password } = body;

        if (!host || !port || !user) {
            return NextResponse.json({ error: "Host, port, and user are required" }, { status: 400 });
        }

        const tenantId = session.user.tenant_id;

        // If password is provided, encrypt it. If not, maybe we are just updating the other fields.
        // We require password on creation, but allow skipping it on update if it already exists.
        const existing = await prisma.smtpConfig.findUnique({ where: { tenant_id: tenantId } });

        if (!existing && !password) {
            return NextResponse.json({ error: "Password is required for new configurations" }, { status: 400 });
        }

        let encryptedPassword = existing?.password || "";
        if (password) {
            encryptedPassword = encrypt(password);
        }

        // Verify configuration by attempting to connect to the SMTP server
        try {
            const parsedPort = parseInt(port, 10);
            // Port 465 requires secure: true (implicit TLS). Port 587 requires secure: false (STARTTLS)
            const isSecure = parsedPort === 465 ? true : (parsedPort === 587 ? false : Boolean(secure));

            const transporter = nodemailer.createTransport({
                host,
                port: parsedPort,
                secure: isSecure,
                auth: {
                    user,
                    pass: password || "hidden" // if they didn't provide it, we can't test it right now unless we decrypt
                }
            });
            // We only verify if they provided a new password to test
            if (password) {
                await transporter.verify();
            }
        } catch (verifyErr: any) {
            console.error("SMTP verification failed:", verifyErr);
            return NextResponse.json({ error: "SMTP verification failed. Please check your credentials. " + verifyErr.message }, { status: 400 });
        }

        const parsedPort = parseInt(port, 10);
        const isSecure = parsedPort === 465 ? true : (parsedPort === 587 ? false : Boolean(secure));

        const config = await prisma.smtpConfig.upsert({
            where: { tenant_id: tenantId },
            create: {
                tenant_id: tenantId,
                host,
                port: parsedPort,
                secure: isSecure,
                user,
                password: encryptedPassword
            },
            update: {
                host,
                port: parsedPort,
                secure: isSecure,
                user,
                ...(password && { password: encryptedPassword })
            }
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Error saving SMTP config:", err);
        return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 });
    }
}
