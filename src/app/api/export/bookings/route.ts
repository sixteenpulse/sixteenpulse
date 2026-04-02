import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { getEventTypeFilter } from "@/lib/event-filter";

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q") || "";
        const statusFilter = searchParams.get("status") || "";
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const filter = await getEventTypeFilter(session.user.tenant_id);
        const ef = filter ? { event_type_name: { in: filter } } : {};
        const baseWhere: any = { tenant_id: session.user.tenant_id, ...ef };

        if (startDate || endDate) {
            baseWhere.start_time = {};
            if (startDate) baseWhere.start_time.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                baseWhere.start_time.lte = end;
            }
        }

        if (q) {
            baseWhere.OR = [
                { attendee_name: { contains: q, mode: "insensitive" } },
                { attendee_email: { contains: q, mode: "insensitive" } },
                { event_type_name: { contains: q, mode: "insensitive" } },
            ];
        }

        const now = new Date();
        const where: any = { ...baseWhere };

        if (statusFilter === "SCHEDULED") {
            where.status = "SCHEDULED";
            where.end_time = { gte: now };
        } else if (statusFilter === "COMPLETED") {
            where.OR = [
                ...(where.OR || []),
                { status: "COMPLETED" },
                { status: "SCHEDULED", end_time: { lt: now } }
            ];
        } else if (statusFilter) {
            where.status = statusFilter;
        }

        // Streaming Response
        const stream = new ReadableStream({
            async start(controller) {
                const headers = [
                    "Booking ID", "Booked On", "Service Date", "Time", "Client Name", 
                    "Client Email", "Phone", "Service", "Duration (min)", "Status", "Host", 
                    "Amount", "Location"
                ];
                controller.enqueue(new TextEncoder().encode(headers.join(",") + "\n"));

                let skip = 0;
                const limit = 1000;

                while (true) {
                    const bookings = await prisma.booking.findMany({
                        where,
                        orderBy: { start_time: "desc" },
                        skip,
                        take: limit
                    });

                    if (bookings.length === 0) break;

                    const rows = bookings.map(b => {
                        const start = new Date(b.start_time);
                        const end = new Date(b.end_time);
                        const created = new Date(b.created_at);
                        const duration = Math.round((end.getTime() - start.getTime()) / 60000);
                        
                        let phone = "";
                        let location = "";
                        let description = "";
                        
                        // Attempt to extract phone number and descriptions from custom responses
                        if (b.metadata) {
                            const meta: any = typeof b.metadata === "string" ? JSON.parse(b.metadata) : b.metadata;
                            location = meta?.location || "";
                            description = meta?.description || "";
                            
                            if (meta?.responses) {
                                for (const [key, value] of Object.entries(meta.responses)) {
                                    const valStr = typeof value === "object" ? (value as any)?.optionValue : String(value);
                                    const keyLower = key.toLowerCase();
                                    
                                    if (keyLower.includes("phone") || keyLower.includes("number")) {
                                        phone = valStr || "";
                                    } else if (keyLower.includes("notes") || keyLower.includes("description") || keyLower.includes("share anything") || valStr?.length > 30) {
                                        // If there's a long custom response or a notes field, use it as description if top-level is empty or identical to location
                                        if (!description || description === location) {
                                            description = valStr || "";
                                        }
                                    }
                                }
                            }
                        }

                        // Force Excel to format as text and not scientific notation or weird dates
                        const excelStr = (str: string | null | undefined) => `=" ${(str || "").toString().replace(/"/g, '""').trim()} "`;
                        const esc = (str: string | null | undefined) => `"${(str || "").toString().replace(/"/g, '""')}"`;

                        return [
                            esc(b.cal_booking_id),
                            excelStr(format(created, "yyyy-MM-dd HH:mm")),
                            excelStr(format(start, "yyyy-MM-dd")),
                            excelStr(format(start, "hh:mm a")),
                            esc(b.attendee_name),
                            esc(b.attendee_email),
                            excelStr(phone),
                            esc(b.event_type_name),
                            duration.toString(),
                            b.status,
                            esc(b.host_name),
                            b.amount !== null ? b.amount.toString() : "0",
                            esc(location)
                        ].join(",");
                    });

                    controller.enqueue(new TextEncoder().encode(rows.join("\n") + "\n"));
                    skip += limit;
                }

                // Append Total Earning row at the bottom
                const totalAgg = await prisma.booking.aggregate({
                    where,
                    _sum: { amount: true }
                });
                const grandTotal = totalAgg._sum.amount || 0;
                
                // Index 11 is "Amount". So we need 10 empty commas before it
                controller.enqueue(new TextEncoder().encode(`\n,,,,,,,,,,"TOTAL EARNINGS:",${grandTotal},,\n`));
                
                controller.close();
            }
        });

        return new NextResponse(stream, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="bookings-${format(now, "yyyy-MM-dd")}.csv"`,
                "Cache-Control": "no-cache",
            }
        });
    } catch (err) {
        console.error("Export error:", err);
        return NextResponse.json({ error: "Export failed" }, { status: 500 });
    }
}
