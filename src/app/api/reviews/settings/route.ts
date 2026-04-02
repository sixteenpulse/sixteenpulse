import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: session.user.tenant_id },
            include: { reviewTemplate: true }
        });

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        // Default template if one doesn't exist yet
        const template = tenant.reviewTemplate || {
            subject: "How was your experience today?",
            body_html: "<p>Hi {{client.name}},</p><p>Thank you so much for visiting us today! We're constantly striving to improve, and your feedback means the world to us.</p><p>Could you take 30 seconds to let us know how we did?</p>"
        };

        return NextResponse.json({
            google_review_link: tenant.google_review_link,
            automate_review_requests: tenant.automate_review_requests,
            review_delay_value: tenant.review_delay_value,
            template: tenant.reviewTemplate || { subject: "", body_html: "" }
        });
    } catch (err) {
        console.error("Error fetching review settings:", err);
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
        const { google_review_link, automate_review_requests, review_delay_value, subject, body_html } = body;
        const tenantId = session.user.tenant_id;

        // 2. Update Tenant Settings
        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                google_review_link: body.google_review_link,
                automate_review_requests: body.automate_review_requests,
                review_delay_value: body.review_delay_value
            }
        });

        // 2. Upsert Review Template
        if (subject && body_html) {
            await prisma.reviewRequestTemplate.upsert({
                where: { tenant_id: tenantId },
                create: {
                    tenant_id: tenantId,
                    subject,
                    body_html
                },
                update: {
                    subject,
                    body_html
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Error saving review settings:", err);
        return NextResponse.json({ error: err.message || "Failed to save configuration" }, { status: 500 });
    }
}
