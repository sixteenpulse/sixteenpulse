import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format, addDays, differenceInMinutes } from "date-fns";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getEventTypeFilter } from "@/lib/event-filter";
import { extractPhone, extractLocation } from "@/lib/booking-utils";

export default async function TodayPage() {
    const session = await getSession();
    if (!session?.user?.tenant_id) return redirect("/login");

    const tid = session.user.tenant_id;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = addDays(todayStart, 1);

    // Fire database queries perfectly in parallel
    const [filter, allTodayBookings] = await Promise.all([
        getEventTypeFilter(tid),
        prisma.booking.findMany({
            where: {
                tenant_id: tid,
                start_time: { gte: todayStart, lt: todayEnd },
                status: { in: ["SCHEDULED", "COMPLETED"] },
            },
            orderBy: { start_time: "asc" },
        })
    ]);

    // Apply the event type filter in-memory (very fast for a single day's bookings)
    const todayBookings = filter 
        ? allTodayBookings.filter(b => filter.includes(b.event_type_name))
        : allTodayBookings;

    const upcoming = todayBookings.filter(b => new Date(b.start_time) >= now);
    const past = todayBookings.filter(b => new Date(b.start_time) < now);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-2xl font-normal text-stone-900">{format(now, "EEEE, MMMM d")}</h1>
                <div className="flex gap-4 mt-1.5 text-sm">
                    <span className="text-stone-400"><span className="font-medium text-stone-700">{todayBookings.length}</span> total</span>
                    <span className="text-stone-400"><span className="font-medium text-stone-600">{upcoming.length}</span> upcoming</span>
                    <span className="text-stone-400"><span className="font-medium text-stone-400">{past.length}</span> done</span>
                </div>
            </div>

            <div className="space-y-3">
                {todayBookings.length === 0 ? (
                    <div className="bg-white rounded-lg border border-[#e5e3d9] p-12 text-center">
                        <p className="text-stone-500 text-sm">No bookings for today.</p>
                        <Link href="/bookings" className="text-stone-900 text-sm font-medium hover:underline mt-2 inline-block">View all bookings</Link>
                    </div>
                ) : (
                    todayBookings.map((b) => {
                        const start = new Date(b.start_time);
                        const end = new Date(b.end_time);
                        const dur = differenceInMinutes(end, start);
                        const isPast = start < now;
                        const meta = b.metadata as any;
                        const phone = extractPhone(meta);
                        const loc = extractLocation(meta);
                        const computedStatus = (b.status === "SCHEDULED" && isPast) ? "COMPLETED" : b.status;

                        return (
                            <Link
                                key={b.id}
                                href={`/bookings/${b.id}`}
                                className={`block bg-white rounded-lg border border-[#e5e3d9] p-5 hover:border-[#d4d1c6] transition-colors duration-150 group ${isPast ? "opacity-60" : ""}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 min-w-0">
                                        <div className="text-center shrink-0 w-16">
                                            <div className="text-sm font-medium text-stone-900">{format(start, "h:mm a")}</div>
                                            <div className="text-xs text-stone-400">{dur} min</div>
                                        </div>
                                        <div className="w-px self-stretch bg-[#e4ddd4] shrink-0" />
                                        <div className="min-w-0">
                                            <div className="font-medium text-stone-900 group-hover:text-blue-600 text-sm transition-colors duration-150">{b.attendee_name}</div>
                                            <div className="text-xs text-stone-400 mt-0.5">{b.event_type_name}</div>
                                            <div className="flex items-center gap-3 mt-1.5 text-xs text-stone-400">
                                                {phone && <span>{phone}</span>}
                                                {loc && <span className="truncate max-w-[200px]">{loc}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        {b.amount != null && (
                                            <span className="text-sm font-medium text-stone-700">${b.amount.toFixed(2)}</span>
                                        )}
                                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${computedStatus === "COMPLETED"
                                            ? "bg-[#f3f2ee] text-stone-600 border border-[#e5e3d9]"
                                            : "bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]"
                                            }`}>
                                            {computedStatus === "COMPLETED" ? "Done" : "Upcoming"}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}
