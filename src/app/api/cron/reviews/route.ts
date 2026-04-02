import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/marketing-engine";

export async function POST(req: Request) {
    // Determine the authorization for this cron job
    // E.g., validating a secret token in headers (CRON_SECRET)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || "dev-secret"}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Find all COMPLETED bookings where the tenant wants automated reviews
        // For a robust system, we would track which bookings have already been processed to avoid scanning everything.
        // We'll look for bookings in the last 14 days to accommodate up to a 1-week delay.
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const recentCompletedBookings = await prisma.booking.findMany({
            where: {
                status: "COMPLETED",
                end_time: { gte: twoWeeksAgo },
                tenant: {
                    automate_review_requests: true,
                    smtpConfig: { isNot: null }
                }
            },
            include: {
                tenant: {
                    include: { reviewTemplate: true }
                }
            }
        });

        let debugRaw = [];
        let sentCount = 0;

        for (const booking of recentCompletedBookings) {
            const tenant = booking.tenant;

            let skipReason = null;

            if (!booking.attendee_email) continue;

            // Upsert the client so they exist in the CRM and can be tracked for reviews
            const client = await prisma.client.upsert({
                where: { tenant_id_email: { tenant_id: tenant.id, email: booking.attendee_email } },
                update: { name: booking.attendee_name || undefined },
                create: {
                    tenant_id: tenant.id,
                    email: booking.attendee_email,
                    name: booking.attendee_name || "Guest"
                }
            }).catch(async (e) => {
                // Fallback to findFirst if upsert fails due to schema quirks
                return await prisma.client.findFirst({
                    where: { tenant_id: tenant.id, email: booking.attendee_email }
                });
            });

            if (!client) continue;

            // 1.5 Calculate if enough time has passed based on the Tenant's preference
            const delayHours = tenant.review_delay_value ?? 24;
            const hoursSinceCompletion = (Date.now() - new Date(booking.end_time).getTime()) / (1000 * 60 * 60);

            if (hoursSinceCompletion < delayHours) {
                // Not enough time has passed yet, skip for now.
                continue;
            }

            // 2. Check if Client already has a ReviewRequest
            const existingRequest = await prisma.reviewRequest.findUnique({
                where: { client_id: client.id }
            });

            if (existingRequest) {
                // They already received a request before, skip to avoid spam.
                continue;
            }

            // 3. Prepare the Template
            const template = tenant.reviewTemplate || {
                subject: "How was your experience today?",
                body_html: "<p>Hi {{client.name}},</p><p>Thank you so much for visiting us today! We're constantly striving to improve, and your feedback means the world to us.</p><p>Could you take 30 seconds to let us know how we did?</p>"
            };

            // Inject Variables
            const clientFirstName = client.name ? client.name.split(" ")[0] : "there";
            const subject = template.subject.replace("{{client.name}}", clientFirstName);
            let bodyHtml = template.body_html.replace("{{client.name}}", clientFirstName);

            // Inject the vital Feedback Action Button
            // NOTE: Replace localhost with the actual domain in production via ENV variables
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            const feedbackLink = `${appUrl}/feedback/${tenant.id}/${booking.id}`;

            bodyHtml += `
            <br/><br/>
            <div style="text-align: center; margin-top: 30px;">
                <a href="${feedbackLink}" style="background-color: #1c1917; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Leave Feedback</a>
            </div>
            `;

            // 4. Send Email via marketing engine (which uses their specific SMTP if configured)
            const emailSent = await sendEmail({
                tenantId: tenant.id,
                to: client.email,
                subject: subject,
                html: bodyHtml
            });

            // 5. If successful, record the request
            if (emailSent) {
                await prisma.reviewRequest.create({
                    data: {
                        tenant_id: tenant.id,
                        client_id: client.id,
                        booking_id: booking.id,
                        status: "SENT"
                    }
                });
                sentCount++;
            }
        }

        return NextResponse.json({ success: true, processed: recentCompletedBookings.length, sent: sentCount });

    } catch (err) {
        console.error("Error processing automated reviews:", err);
        return NextResponse.json({ error: "Dispatcher failed" }, { status: 500 });
    }
}
