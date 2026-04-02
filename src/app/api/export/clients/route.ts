import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { getEventTypeFilter } from "@/lib/event-filter";
import { extractPhone } from "@/lib/booking-utils";

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.user?.tenant_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q") || "";
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const tid = session.user.tenant_id;
        const filter = await getEventTypeFilter(tid);
        const ef: any = filter ? { event_type_name: { in: filter } } : {};

        if (startDate || endDate) {
            ef.start_time = {};
            if (startDate) ef.start_time.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                ef.start_time.lte = end;
            }
        }

        const clientAgg = await prisma.booking.groupBy({
            by: ["attendee_email"],
            where: {
                tenant_id: tid,
                ...ef,
                ...(q ? {
                    OR: [
                        { attendee_name: { contains: q, mode: "insensitive" } },
                        { attendee_email: { contains: q, mode: "insensitive" } },
                    ],
                } : {}),
            },
            _count: { id: true },
            _max: { start_time: true },
            _min: { start_time: true },
            _sum: { amount: true },
            orderBy: { _count: { id: "desc" } },
        });

        const clientEmails = clientAgg.map(c => c.attendee_email);

        const latestBookings = clientEmails.length > 0
            ? await prisma.$queryRaw<{ email: string; name: string; service: string; metadata: any }[]>`
                SELECT DISTINCT ON (attendee_email)
                    attendee_email as email,
                    attendee_name as name,
                    event_type_name as service,
                    metadata::text as metadata
                FROM "Booking"
                WHERE tenant_id = ${tid} AND attendee_email = ANY(${clientEmails})
                ORDER BY attendee_email, start_time DESC
            `
            : [];

        const clientDetails = new Map<string, { name: string; phone: string; service: string; location: string }>();
        for (const row of latestBookings) {
            let meta: any = null;
            try {
                meta = typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata;
            } catch { }

            let customResponses = "";
            let location = meta?.location || "";
            
            if (meta?.responses) {
                const responsePairs: string[] = [];
                for (const [key, value] of Object.entries(meta.responses)) {
                    if (typeof value === "object" && value !== null) {
                        responsePairs.push(`${key}: ${(value as any)?.optionValue || JSON.stringify(value)}`);
                    } else {
                        responsePairs.push(`${key}: ${value}`);
                    }
                }
                customResponses = responsePairs.join(" | ");
            }

            clientDetails.set(row.email, { 
                name: row.name, 
                phone: extractPhone(meta) || "",
                service: row.service,
                location: location
            });
        }

        const headers = [
            "Client Name", "Email", "Phone", "Total Visits", "Total Revenue", 
            "First Visit", "Last Visit", "Latest Service", "Latest Location"
        ];
        
        const excelStr = (str: string | null | undefined) => `=" ${(str || "").toString().replace(/"/g, '""').trim()} "`;
        const esc = (str: string | null | undefined) => `"${(str || "").toString().replace(/"/g, '""')}"`;

        let grandTotal = 0;

        const rows = clientAgg.map(c => {
            const details = clientDetails.get(c.attendee_email);
            const name = details?.name || c.attendee_email.split("@")[0] || "";
            const firstVisit = c._min.start_time;
            const lastVisit = c._max.start_time;
            
            if (c._sum.amount) {
                grandTotal += c._sum.amount;
            }

            return [
                esc(name),
                esc(c.attendee_email),
                excelStr(details?.phone),
                c._count.id.toString(),
                c._sum.amount ? c._sum.amount.toFixed(2) : "0.00",
                firstVisit ? excelStr(format(new Date(firstVisit), "yyyy-MM-dd")) : "",
                lastVisit ? excelStr(format(new Date(lastVisit), "yyyy-MM-dd")) : "",
                esc(details?.service),
                esc(details?.location)
            ].join(",");
        });

        rows.push(`\n,,,"TOTAL EARNINGS:",${grandTotal.toFixed(2)},,,,\n`);

        const csv = [headers.join(","), ...rows].join("\n");

        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="clients-${format(new Date(), "yyyy-MM-dd")}.csv"`,
                "Cache-Control": "no-cache",
            }
        });

    } catch (err) {
        console.error("Client export error:", err);
        return NextResponse.json({ error: "Export failed" }, { status: 500 });
    }
}
