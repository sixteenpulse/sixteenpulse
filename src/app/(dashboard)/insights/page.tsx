import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";
import { getEventTypeFilter } from "@/lib/event-filter";

export default async function InsightsPage() {
    const session = await getSession();
    if (!session?.user?.tenant_id) return redirect("/login");

    const tid = session.user.tenant_id;
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const filter = await getEventTypeFilter(tid);
    const ef = filter ? { event_type_name: { in: filter } } : {};

    const [
        totalBookings,
        cancelledBookings,
        currentMonthCount,
        lastMonthCount,
        topServicesRaw,
        hourBuckets,
        totalRevenue,
        currentMonthRevenue,
        lastMonthRevenue,
    ] = await Promise.all([
        prisma.booking.count({ where: { tenant_id: tid, ...ef } }),
        prisma.booking.count({ where: { tenant_id: tid, status: "CANCELLED", ...ef } }),
        prisma.booking.count({
            where: { tenant_id: tid, start_time: { gte: currentMonthStart, lte: currentMonthEnd }, ...ef },
        }),
        prisma.booking.count({
            where: { tenant_id: tid, start_time: { gte: lastMonthStart, lte: lastMonthEnd }, ...ef },
        }),
        prisma.booking.groupBy({
            by: ["event_type_name"],
            where: { tenant_id: tid, ...ef },
            _count: { id: true },
            orderBy: { _count: { id: "desc" } },
            take: 5,
        }),
        filter
            ? prisma.$queryRaw<{ hour: number; cnt: bigint }[]>`
                SELECT EXTRACT(HOUR FROM start_time)::int as hour, COUNT(*)::bigint as cnt
                FROM "Booking"
                WHERE tenant_id = ${tid} AND event_type_name = ANY(${filter})
                GROUP BY hour ORDER BY hour
            `
            : prisma.$queryRaw<{ hour: number; cnt: bigint }[]>`
                SELECT EXTRACT(HOUR FROM start_time)::int as hour, COUNT(*)::bigint as cnt
                FROM "Booking"
                WHERE tenant_id = ${tid}
                GROUP BY hour ORDER BY hour
            `,
        prisma.booking.aggregate({
            where: { tenant_id: tid, status: { not: "CANCELLED" }, amount: { not: null }, ...ef },
            _sum: { amount: true },
        }),
        prisma.booking.aggregate({
            where: {
                tenant_id: tid,
                start_time: { gte: currentMonthStart, lte: currentMonthEnd },
                status: { not: "CANCELLED" },
                amount: { not: null },
                ...ef,
            },
            _sum: { amount: true },
        }),
        prisma.booking.aggregate({
            where: {
                tenant_id: tid,
                start_time: { gte: lastMonthStart, lte: lastMonthEnd },
                status: { not: "CANCELLED" },
                amount: { not: null },
                ...ef,
            },
            _sum: { amount: true },
        }),
    ]);

    const cancelledCount = cancelledBookings;
    const cancellationRate = totalBookings > 0 ? ((cancelledCount / totalBookings) * 100).toFixed(1) : "0.0";

    const bookingGrowth = lastMonthCount > 0
        ? (((currentMonthCount - lastMonthCount) / lastMonthCount) * 100).toFixed(1)
        : currentMonthCount > 0 ? "100.0" : "0.0";
    const bookingGrowthPositive = parseFloat(bookingGrowth) >= 0;

    const grossRevenue = totalRevenue._sum.amount || 0;
    const currentMonthRev = currentMonthRevenue._sum.amount || 0;
    const lastMonthRev = lastMonthRevenue._sum.amount || 0;
    const revenueGrowth = lastMonthRev > 0
        ? (((currentMonthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1)
        : currentMonthRev > 0 ? "100.0" : "0.0";
    const revenueGrowthPositive = parseFloat(revenueGrowth) >= 0;

    const topServices = topServicesRaw.map(s => [s.event_type_name, s._count.id] as [string, number]);

    const hourCounts: Record<number, number> = {};
    for (const row of hourBuckets) {
        hourCounts[Number(row.hour)] = Number(row.cnt);
    }

    const timeSlots = [
        { label: "8 AM", hours: [7, 8, 9] },
        { label: "10 AM", hours: [10, 11] },
        { label: "12 PM", hours: [12, 13] },
        { label: "2 PM", hours: [14, 15] },
        { label: "4 PM", hours: [16, 17] },
        { label: "6 PM", hours: [18, 19, 20] },
    ];

    const slotCounts = timeSlots.map(slot => ({
        ...slot,
        count: slot.hours.reduce((sum, h) => sum + (hourCounts[h] || 0), 0)
    }));

    const maxSlotCount = Math.max(...slotCounts.map(s => s.count), 1);

    return (
        <div className="space-y-5">
            <h1 className="font-display text-2xl font-normal text-stone-900">Insights</h1>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-[#e5e3d9] p-5">
                    <p className="text-xs font-medium text-stone-400 mb-2">Total Revenue</p>
                    <p className="text-2xl font-semibold text-stone-900">${grossRevenue.toFixed(2)}</p>
                    <p className="text-xs mt-2">
                        <span className={`font-medium ${revenueGrowthPositive ? "text-emerald-600" : "text-red-500"}`}>
                            {revenueGrowthPositive ? "+" : ""}{revenueGrowth}%
                        </span>
                        <span className="text-stone-400 ml-1">vs last month</span>
                    </p>
                </div>
                <div className="bg-white rounded-lg border border-[#e5e3d9] p-5">
                    <p className="text-xs font-medium text-stone-400 mb-2">Total Bookings</p>
                    <p className="text-2xl font-semibold text-stone-900">{totalBookings}</p>
                    <p className="text-xs mt-2">
                        <span className={`font-medium ${bookingGrowthPositive ? "text-emerald-600" : "text-red-500"}`}>
                            {bookingGrowthPositive ? "+" : ""}{bookingGrowth}%
                        </span>
                        <span className="text-stone-400 ml-1">vs last month</span>
                    </p>
                </div>
                <div className="bg-white rounded-lg border border-[#e5e3d9] p-5">
                    <p className="text-xs font-medium text-stone-400 mb-2">Cancellation Rate</p>
                    <p className="text-2xl font-semibold text-stone-900">{cancellationRate}%</p>
                    <p className="text-xs mt-2">
                        <span className={`font-medium ${parseFloat(cancellationRate) > 10 ? "text-red-500" : "text-emerald-600"}`}>
                            {parseFloat(cancellationRate) > 10 ? "High" : "Healthy"}
                        </span>
                        <span className="text-stone-400 ml-1">{cancelledCount} of {totalBookings}</span>
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg border border-[#e5e3d9] overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#e5e3d9]">
                        <h2 className="text-sm font-medium text-stone-900">Popular Services</h2>
                    </div>
                    <div className="p-5 space-y-4">
                        {topServices.length === 0 ? (
                            <p className="text-stone-400 text-sm py-4 text-center">No data yet.</p>
                        ) : (
                            topServices.map(([name, count], index) => (
                                <div key={index}>
                                    <div className="flex justify-between text-sm mb-1.5">
                                        <span className="font-medium text-stone-900 text-[13px]">{name}</span>
                                        <span className="text-stone-400 text-[13px]">{count}</span>
                                    </div>
                                    <div className="w-full bg-[#f3f2ee] h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-stone-800 h-1.5 rounded-full" style={{ width: `${(count / totalBookings) * 100}%` }} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-[#e5e3d9] overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#e5e3d9]">
                        <h2 className="text-sm font-medium text-stone-900">Peak Hours</h2>
                    </div>
                    <div className="p-5">
                        {totalBookings === 0 ? (
                            <p className="text-stone-400 text-sm py-4 text-center">No data yet.</p>
                        ) : (
                            <div className="flex items-end gap-2 h-28 pt-4 relative border-b border-[#e4ddd4] mb-3">
                                {slotCounts.map((slot, i) => {
                                    const height = maxSlotCount > 0 ? (slot.count / maxSlotCount) * 100 : 0;
                                    const isPeak = slot.count === maxSlotCount && slot.count > 0;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                            <span className="text-[10px] text-stone-400">{slot.count > 0 ? slot.count : ""}</span>
                                            <div
                                                className={`w-full rounded-t-md ${isPeak ? "bg-stone-800" : "bg-[#f3f2ee]"}`}
                                                style={{ height: `${Math.max(height, 4)}%` }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <div className="flex justify-between text-[10px] text-stone-400">
                            {slotCounts.map((slot, i) => <span key={i}>{slot.label}</span>)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
