import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { BookingRowActions } from "@/components/bookings/BookingRowActions";
import { NewBookingButton } from "@/components/bookings/NewBookingModal";
import { ExportButton } from "@/components/ui/ExportButton";
import { getEventTypeFilter } from "@/lib/event-filter";
import { SyncButton } from "@/components/bookings/SyncButton";
import { AmountCell } from "@/components/bookings/AmountCell";
import { extractPhone } from "@/lib/booking-utils";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { TabsSkeleton, SyncButtonSkeleton } from "@/components/ui/TabsSkeleton";

interface PageProps {
    searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}

export default async function BookingsPage({ searchParams }: PageProps) {
    const session = await getSession();
    if (!session?.user?.tenant_id) return redirect("/login");

    const params = await searchParams;
    const q = params.q || "";
    const statusFilter = params.status || "";

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="font-display text-2xl font-normal text-stone-900">Bookings</h1>
                <div className="flex items-center gap-2">
                    <SearchInput placeholder="Search..." className="w-40 sm:w-52" />
                    <ExportButton />
                    <Suspense fallback={<SyncButtonSkeleton />}>
                        <SyncButtonWrapper tenantId={session.user.tenant_id} />
                    </Suspense>
                    <NewBookingButton />
                </div>
            </div>

            <Suspense fallback={<TabsSkeleton />}>
                <BookingsTabs tenantId={session.user.tenant_id} q={q} statusFilter={statusFilter} />
            </Suspense>

            <Suspense key={`${q}-${statusFilter}-${params.page || "1"}`} fallback={<TableSkeleton rows={10} columns={7} />}>
                <BookingsTable searchParams={params} tenantId={session.user.tenant_id} q={q} statusFilter={statusFilter} />
            </Suspense>
        </div>
    );
}

async function SyncButtonWrapper({ tenantId }: { tenantId: string }) {
    const connection = await prisma.calConnection.findFirst({
        where: { tenant_id: tenantId, status: "CONNECTED" },
        select: { id: true }
    });
    return connection ? <SyncButton connectionId={connection.id} /> : null;
}

async function BookingsTabs({ tenantId, q, statusFilter }: { tenantId: string, q: string, statusFilter: string }) {
    const filter = await getEventTypeFilter(tenantId);
    const ef = filter ? { event_type_name: { in: filter } } : {};
    const baseWhere: any = { tenantId: tenantId, ...ef };

    const now = new Date();

    const [cancelledCount, countCompleted, countScheduled] = await Promise.all([
        prisma.booking.count({
            where: { tenant_id: tenantId, status: "CANCELLED", ...ef }
        }),
        prisma.booking.count({
            where: {
                tenant_id: tenantId,
                ...ef,
                OR: [
                    { status: "COMPLETED" },
                    { status: "SCHEDULED", end_time: { lt: now } }
                ]
            }
        }),
        prisma.booking.count({
            where: {
                tenant_id: tenantId,
                status: "SCHEDULED",
                end_time: { gte: now },
                ...ef
            }
        })
    ]);

    const totalAll = countScheduled + countCompleted + cancelledCount;

    const tabs = [
        { key: "", label: "All", count: totalAll },
        { key: "SCHEDULED", label: "Upcoming", count: countScheduled },
        { key: "COMPLETED", label: "Completed", count: countCompleted },
        { key: "CANCELLED", label: "Cancelled", count: cancelledCount },
    ];

    return (
        <div className="flex gap-1.5 text-sm">
            {tabs.map((tab) => {
                const isActive = statusFilter === tab.key;
                const href = tab.key
                    ? `/bookings?status=${tab.key}${q ? `&q=${q}` : ""}`
                    : `/bookings${q ? `?q=${q}` : ""}`;
                return (
                    <Link key={tab.key} href={href}
                        className={`px-3.5 py-1.5 rounded-lg text-[13px] transition-colors duration-150 ${isActive
                            ? "bg-stone-900 text-white font-medium"
                            : "bg-white border border-[#e5e3d9] text-stone-600 hover:bg-[#fcfcfb] hover:text-stone-900 font-normal"
                            }`}>
                        {tab.label} <span className={isActive ? "text-stone-300 ml-1" : "text-stone-400 ml-1"}>{tab.count}</span>
                    </Link>
                );
            })}
        </div>
    );
}

async function BookingsTable({ searchParams, tenantId, q, statusFilter }: any) {
    const page = parseInt(searchParams.page || "1");
    const limit = 20;

    const filter = await getEventTypeFilter(tenantId);
    const ef = filter ? { event_type_name: { in: filter } } : {};
    const baseWhere: any = { tenant_id: tenantId, ...ef };

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

    const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
            where,
            orderBy: { start_time: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.booking.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const statusBadge = (computedStatus: string) => {
        const map: Record<string, string> = {
            SCHEDULED: "bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]",
            COMPLETED: "bg-[#f3f2ee] text-stone-600 border border-[#e5e3d9]",
            CANCELLED: "bg-red-50 text-red-600 border border-red-200",
            RESCHEDULED: "bg-amber-50 text-amber-700 border border-amber-200",
        };
        const label: Record<string, string> = {
            SCHEDULED: "Upcoming",
            COMPLETED: "Completed",
            CANCELLED: "Cancelled",
            RESCHEDULED: "Rescheduled",
        };
        const cls = map[computedStatus] || "bg-[#fcfcfb] text-stone-500 border border-[#e5e3d9]";
        return <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${cls}`}>{label[computedStatus] || computedStatus}</span>;
    };

    return (
        <div className="space-y-4">
            <div className="w-full overflow-x-auto bg-white rounded-lg border border-[#e5e3d9] shadow-sm" style={{ WebkitOverflowScrolling: "touch" }}>
                <table className="w-full min-w-[850px] text-left text-sm whitespace-nowrap">
                    <thead>
                        <tr className="bg-[#fcfcfb] border-b border-[#e5e3d9] text-stone-500">
                            <th className="px-5 py-3 font-medium text-[13px]">Date & Time</th>
                            <th className="px-5 py-3 font-medium text-[13px]">Client</th>
                            <th className="px-5 py-3 font-medium text-[13px]">Phone</th>
                            <th className="px-5 py-3 font-medium text-[13px]">Service</th>
                            <th className="px-5 py-3 font-medium text-[13px]">Amount</th>
                            <th className="px-5 py-3 font-medium text-[13px]">Status</th>
                            <th className="px-5 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e4ddd4]">
                        {bookings.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-16 text-center text-stone-400 text-sm">
                                    {q ? `No results for "${q}"` : statusFilter ? `No ${statusFilter.toLowerCase()} bookings.` : "No bookings yet."}
                                </td>
                            </tr>
                        ) : (
                            bookings.map((b) => {
                                const phone = extractPhone(b.metadata);
                                let computedStatus = b.status;
                                if (b.status === "SCHEDULED" && new Date(b.end_time) < new Date()) {
                                    computedStatus = "COMPLETED";
                                }

                                return (
                                    <tr key={b.id} className="hover:bg-cream transition-colors duration-150 group">
                                        <td className="px-5 py-4 whitespace-nowrap text-stone-900">
                                            <Link href={`/bookings/${b.id}`} className="block">
                                                <div className="font-medium text-[13px]">{format(new Date(b.start_time), "MMM d, yyyy")}</div>
                                                <div className="text-xs text-stone-400 mt-0.5">{format(new Date(b.start_time), "h:mm a")} – {format(new Date(b.end_time), "h:mm a")}</div>
                                            </Link>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <Link href={`/bookings/${b.id}`} className="block">
                                                <div className="font-medium text-stone-900 text-[13px] group-hover:text-blue-600 transition-colors duration-150">{b.attendee_name}</div>
                                                <div className="text-xs text-stone-500 mt-0.5">{b.attendee_email}</div>
                                            </Link>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap text-stone-600 text-[13px]">
                                            {phone || <span className="text-stone-300">—</span>}
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap text-stone-600 text-[13px]">
                                            {b.event_type_name}
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap border-l border-transparent">
                                            <AmountCell bookingId={b.id} initialAmount={b.amount} />
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            {statusBadge(computedStatus)}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <BookingRowActions
                                                bookingId={b.id}
                                                status={computedStatus}
                                                originalStatus={b.status}
                                            />
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            <Pagination total={total} page={page} limit={limit} totalPages={totalPages} />
        </div>
    );
}
