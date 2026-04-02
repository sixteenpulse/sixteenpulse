import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { getEventTypeFilter } from "@/lib/event-filter";
import { extractPhone } from "@/lib/booking-utils";
import { ClientRow } from "@/components/clients/ClientRow";
import { ExportButton } from "@/components/ui/ExportButton";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

interface PageProps {
    searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function ClientsPage({ searchParams }: PageProps) {
    const session = await getSession();
    if (!session?.user?.tenant_id) return redirect("/login");

    const params = await searchParams;
    const q = params.q || "";

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Suspense fallback={<h1 className="font-display text-2xl font-normal text-stone-900">Clients</h1>}>
                    <ClientsHeaderTitle tenantId={session.user.tenant_id} q={q} />
                </Suspense>
                <div className="flex items-center gap-2">
                    <SearchInput placeholder="Search clients..." className="w-40 sm:w-52" />
                    <ExportButton endpoint="/api/export/clients" />
                </div>
            </div>

            <Suspense key={`${q}-${params.page || "1"}`} fallback={<TableSkeleton rows={10} columns={6} />}>
                <ClientsTable searchParams={params} tenantId={session.user.tenant_id} q={q} />
            </Suspense>
        </div>
    );
}

async function ClientsHeaderTitle({ tenantId, q }: { tenantId: string, q: string }) {
    const filter = await getEventTypeFilter(tenantId);
    const ef = filter ? { event_type_name: { in: filter } } : {};
    
    // We do a fast count of distinct emails if possible, or just the same aggregation 
    const clientAgg = await prisma.booking.groupBy({
        by: ["attendee_email"],
        where: {
            tenant_id: tenantId,
            ...ef,
            ...(q ? {
                OR: [
                    { attendee_name: { contains: q, mode: "insensitive" } },
                    { attendee_email: { contains: q, mode: "insensitive" } },
                ],
            } : {}),
        },
    });
    
    return (
        <h1 className="font-display text-2xl font-normal text-stone-900">
            Clients <span className="text-stone-400 font-display text-xl">({clientAgg.length})</span>
        </h1>
    );
}

async function ClientsTable({ searchParams, tenantId, q }: { searchParams: any, tenantId: string, q: string }) {
    const page = parseInt(searchParams.page || "1");
    const limit = 20;

    const filter = await getEventTypeFilter(tenantId);
    const ef = filter ? { event_type_name: { in: filter } } : {};

    const clientAgg = await prisma.booking.groupBy({
        by: ["attendee_email"],
        where: {
            tenant_id: tenantId,
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
        _sum: { amount: true },
        orderBy: { _count: { id: "desc" } },
    });

    const totalClients = clientAgg.length;
    const totalPages = Math.ceil(totalClients / limit);
    const paginatedClients = clientAgg.slice((page - 1) * limit, page * limit);

    const clientEmails = paginatedClients.map(c => c.attendee_email);

    const latestBookings = clientEmails.length > 0
        ? await prisma.$queryRaw<{ email: string; name: string; metadata: any }[]>`
            SELECT DISTINCT ON (attendee_email)
                attendee_email as email,
                attendee_name as name,
                metadata::text as metadata
            FROM "Booking"
            WHERE tenant_id = ${tenantId} AND attendee_email = ANY(${clientEmails})
            ORDER BY attendee_email, start_time DESC
        `
        : [];

    const clientDetails = new Map<string, { name: string; phone: string | null }>();
    for (const row of latestBookings) {
        let meta: any = null;
        try {
            meta = typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata;
        } catch { }
        clientDetails.set(row.email, { name: row.name, phone: extractPhone(meta) });
    }

    return (
        <div className="bg-white rounded-lg border border-[#e5e3d9] overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
                <thead>
                    <tr className="bg-[#fcfcfb] border-b border-[#e5e3d9] text-stone-500">
                        <th className="px-5 py-3 font-medium text-[13px]">Name</th>
                        <th className="px-5 py-3 font-medium text-[13px] hidden md:table-cell">Email</th>
                        <th className="px-5 py-3 font-medium text-[13px] hidden lg:table-cell">Phone</th>
                        <th className="px-5 py-3 font-medium text-[13px]">Visits</th>
                        <th className="px-5 py-3 font-medium text-[13px]">Revenue</th>
                        <th className="px-5 py-3 font-medium text-[13px] hidden md:table-cell">Last Visit</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#e4ddd4]">
                    {paginatedClients.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="py-16 text-center text-stone-400 text-sm">
                                {q ? `No clients matching "${q}"` : "No clients yet."}
                            </td>
                        </tr>
                    ) : (
                        paginatedClients.map((client, i) => {
                            const lastVisit = client._max.start_time;
                            const totalCount = client._count.id;
                            const totalPaid = client._sum.amount;
                            const details = clientDetails.get(client.attendee_email);
                            const name = details?.name || client.attendee_email.split("@")[0];
                            const phone = details?.phone;

                            return (
                                <ClientRow key={i} href={`/clients/${encodeURIComponent(client.attendee_email)}`}>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[#f3f2ee] flex items-center justify-center text-xs font-semibold text-stone-700 uppercase shrink-0">
                                                {name.charAt(0)}
                                            </div>
                                            <div>
                                                <span className="font-medium text-stone-900 text-[13px]">{name}</span>
                                                {totalCount > 3 && <span className="text-amber-500 text-xs ml-1.5" title="Returning client">★</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-stone-600 text-[13px] hidden md:table-cell">{client.attendee_email}</td>
                                    <td className="px-5 py-4 text-stone-600 text-[13px] hidden lg:table-cell">
                                        {phone || <span className="text-stone-300">—</span>}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="font-medium text-stone-900 text-[13px]">{totalCount}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        {totalPaid ? (
                                            <span className="font-medium text-emerald-600 text-[13px]">${totalPaid.toFixed(2)}</span>
                                        ) : (
                                            <span className="text-stone-300">—</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-stone-400 text-[13px] hidden md:table-cell">
                                        {lastVisit ? format(new Date(lastVisit), "MMM d, yyyy") : <span className="text-stone-300">—</span>}
                                    </td>
                                </ClientRow>
                            );
                        })
                    )}
                </tbody>
            </table>
            <Pagination total={totalClients} page={page} limit={limit} totalPages={totalPages} />
        </div>
    );
}
