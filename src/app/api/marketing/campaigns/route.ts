import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processCampaign } from "@/lib/marketing-engine";

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, subject, bodyHtml, audienceId, status } = body;

        const campaign = await prisma.campaign.create({
            data: {
                tenant_id: session.user.tenant_id,
                name,
                subject,
                body_html: bodyHtml,
                audience_id: audienceId,
                status: status || "DRAFT"
            }
        });

        if (status === "SENDING") {
            // Trigger the email processing but don't await it so the UI responds immediately
            processCampaign(campaign.id).catch(console.error);
        }

        return NextResponse.json({ success: true, campaign });
    } catch (err) {

        console.error("Error creating campaign:", err);
        return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
    }
}
