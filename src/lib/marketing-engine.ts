import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import nodemailer from "nodemailer";
import { decrypt } from "@/lib/encryption";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function processCampaign(campaignId: string) {
    try {
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { audience: true, tenant: { include: { smtpConfig: true } } }
        });

        if (!campaign || campaign.status !== "SENDING") return;

        let targetClients: any[] = [];

        if (campaign.audience) {
            // Fetch all clients for this tenant
            const allClients = await prisma.client.findMany({
                where: { tenant_id: campaign.tenant_id }
            });

            // Fetch all bookings for this tenant to evaluate rules
            const allBookings = await prisma.booking.findMany({
                where: { tenant_id: campaign.tenant_id }
            });

            const rules = campaign.audience.rules as Record<string, any>;

            targetClients = allClients.filter(client => {
                let matches = true;
                const clientBookings = allBookings.filter(b => b.attendee_email === client.email);

                // Evaluators based on our MVP rules
                if (rules["event_type_equals"]) {
                    const hasEvent = clientBookings.some(b => b.event_type_name === rules["event_type_equals"]);
                    if (!hasEvent) matches = false;
                }

                if (rules["total_visits_greater_than"]) {
                    const visits = clientBookings.filter(b => b.status === "COMPLETED").length;
                    if (visits <= parseInt(rules["total_visits_greater_than"], 10)) matches = false;
                }

                if (rules["last_visit_days_less_than"]) {
                    const completedBookings = clientBookings.filter(b => b.status === "COMPLETED");
                    if (completedBookings.length === 0) {
                        matches = false;
                    } else {
                        const lastVisit = [...completedBookings].sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime())[0];
                        const daysSince = (new Date().getTime() - new Date(lastVisit.end_time).getTime()) / (1000 * 60 * 60 * 24);
                        if (daysSince >= parseInt(rules["last_visit_days_less_than"], 10)) matches = false;
                    }
                }

                if (rules["total_spent_greater_than"]) {
                    const spent = clientBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
                    if (spent <= parseInt(rules["total_spent_greater_than"], 10)) matches = false;
                }

                return matches;
            });
        } else {
            // If no audience, abort
            console.log(`Campaign ${campaignId} missing audience. Aborting send.`);
            await prisma.campaign.update({
                where: { id: campaignId },
                data: { status: "CANCELLED", updated_at: new Date() }
            });
            return;
        }

        console.log(`Sending campaign ${campaignId} to ${targetClients.length} clients`);

        let transporter: nodemailer.Transporter | null = null;
        let useSmtp = false;
        let smtpSender = "";

        if (campaign.tenant.smtpConfig) {
            const config = campaign.tenant.smtpConfig;
            if (config.password) {
                try {
                    const decryptedPass = decrypt(config.password);
                    const isSecure = config.port === 465 ? true : (config.port === 587 ? false : Boolean(config.secure));

                    transporter = nodemailer.createTransport({
                        host: config.host,
                        port: config.port,
                        secure: isSecure,
                        auth: {
                            user: config.user,
                            pass: decryptedPass
                        }
                    });
                    useSmtp = true;
                    const senderName = campaign.tenant.name ? campaign.tenant.name : "Marketing";
                    smtpSender = `"${senderName}" <${config.user}>`;
                } catch (e) {
                    console.error("Failed to configure SMTP transporter", e);
                }
            }
        }

        for (const client of targetClients) {
            if (!client.email) continue;

            const personalizedHtml = campaign.body_html
                .replace(/{{client\.name}}/g, client.name || "friend")
                .replace(/{{client\.email}}/g, client.email)
                .replace(/{{tenant\.name}}/g, campaign.tenant.name || "us");

            const personalizedSubject = campaign.subject
                .replace(/{{client\.name}}/g, client.name || "friend")
                .replace(/{{client\.email}}/g, client.email)
                .replace(/{{tenant\.name}}/g, campaign.tenant.name || "us");

            try {
                let errorMsg = null;

                if (useSmtp && transporter) {
                    try {
                        await transporter.sendMail({
                            from: smtpSender,
                            to: client.email,
                            subject: personalizedSubject,
                            html: personalizedHtml,
                        });
                    } catch (e: any) {
                        errorMsg = e.message;
                    }
                } else {
                    const senderName = campaign.tenant.name ? `${campaign.tenant.name}` : "Marketing";
                    const { data, error } = await resend.emails.send({
                        from: `${senderName} <onboarding@resend.dev>`,
                        to: [client.email],
                        subject: personalizedSubject,
                        html: personalizedHtml,
                    });
                    if (error) {
                        errorMsg = error.message;
                    }
                }

                await prisma.campaignRecipient.create({
                    data: {
                        campaign_id: campaign.id,
                        email: client.email,
                        status: errorMsg ? "FAILED" : "SENT",
                        sent_at: new Date(),
                        error: errorMsg
                    }
                });
            } catch (err: any) {
                console.error(`Failed to send to ${client.email}`, err);
                await prisma.campaignRecipient.create({
                    data: {
                        campaign_id: campaign.id,
                        email: client.email,
                        status: "FAILED",
                        error: err.message
                    }
                });
            }
        }

        // Mark campaign as completed
        await prisma.campaign.update({
            where: { id: campaign.id },
            data: {
                status: "COMPLETED",
                sent_at: new Date(),
                updated_at: new Date()
            }
        });

    } catch (err) {
        console.error("Error processing campaign:", err);
        await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: "CANCELLED", updated_at: new Date() }
        }).catch(e => console.error(e));
    }
}

export async function sendEmail({ tenantId, to, subject, html }: { tenantId: string; to: string; subject: string; html: string }): Promise<boolean> {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { smtpConfig: true }
        });

        if (!tenant) return false;

        if (tenant.smtpConfig?.password) {
            const config = tenant.smtpConfig;
            const decryptedPass = decrypt(config.password);
            const isSecure = config.port === 465 ? true : (config.port === 587 ? false : Boolean(config.secure));

            const transporter = nodemailer.createTransport({
                host: config.host,
                port: config.port,
                secure: isSecure,
                auth: { user: config.user, pass: decryptedPass }
            });
            const senderName = tenant.name || "Marketing";
            await transporter.sendMail({
                from: `"${senderName}" <${config.user}>`,
                to,
                subject,
                html
            });
            return true;
        }

        // Fallback to Resend
        const senderName = tenant.name || "Marketing";
        const res = await resend.emails.send({
            from: `${senderName} <onboarding@resend.dev>`,
            to: [to],
            subject,
            html,
        });

        return !res.error;
    } catch (err) {
        console.error("sendEmail failed:", err);
        return false;
    }
}
