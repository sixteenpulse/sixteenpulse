import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CalendarView } from "@/components/calendar/CalendarView";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { getEventTypeFilter } from "@/lib/event-filter";
import { CalendarSkeleton } from "@/components/ui/CalendarSkeleton";

interface PageProps {
    searchParams: Promise<{ view?: string; date?: string }>;
}

export default async function CalendarPage({ searchParams }: PageProps) {
    const session = await getSession();
    if (!session?.user?.tenant_id) return redirect("/login");

    const params = await searchParams;

    return (
        <div className="space-y-5">
            <Suspense key={`${params.view || "list"}-${params.date || "now"}`} fallback={<CalendarSkeleton />}>
                <CalendarData params={params} tenantId={session.user.tenant_id} />
            </Suspense>
        </div>
    );
}

async function CalendarData({ params, tenantId }: { params: any, tenantId: string }) {
    const viewParam = params.view || "list";
    const view = viewParam === "month" ? "month" : viewParam === "week" ? "week" : "list";
    const currentDate = params.date ? new Date(params.date) : new Date();

    let rangeStart: Date;
    let rangeEnd: Date;

    if (view === "month") {
        rangeStart = startOfMonth(currentDate);
        rangeEnd = endOfMonth(currentDate);
    } else {
        // week and list both use week range
        rangeStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        rangeEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    }

    const filter = await getEventTypeFilter(tenantId);
    const ef = filter ? { event_type_name: { in: filter } } : {};

    const bookings = await prisma.booking.findMany({
        where: {
            tenant_id: tenantId,
            start_time: { gte: rangeStart, lte: rangeEnd },
            ...ef,
        },
        select: {
            id: true,
            attendee_name: true,
            event_type_name: true,
            start_time: true,
            end_time: true,
            status: true,
        },
        orderBy: { start_time: "asc" },
    });

    const serializedBookings = bookings.map(b => ({
        id: b.id,
        attendee_name: b.attendee_name,
        event_type_name: b.event_type_name,
        start_time: b.start_time.toISOString(),
        end_time: b.end_time.toISOString(),
        status: b.status,
    }));

    return (
        <CalendarView
            bookings={serializedBookings}
            initialView={view}
            initialDate={currentDate.toISOString()}
        />
    );
}
