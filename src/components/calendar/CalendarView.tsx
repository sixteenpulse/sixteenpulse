"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, getDay } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Booking {
    id: string;
    attendee_name: string;
    event_type_name: string;
    start_time: string;
    end_time: string;
    status: string;
}

interface CalendarViewProps {
    bookings: Booking[];
    initialView: "week" | "month" | "list";
    initialDate: string;
}

export function CalendarView({ bookings, initialView, initialDate }: CalendarViewProps) {
    const router = useRouter();
    const [view, setView] = useState<"week" | "month" | "list">(initialView);
    const currentDate = new Date(initialDate);

    const statusColor = (status: string) => {
        switch (status) {
            case "SCHEDULED": return "bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]";
            case "COMPLETED": return "bg-[#f3f2ee] text-stone-600 border-[#e5e3d9]";
            case "CANCELLED": return "bg-red-50 text-red-600 border-red-200 line-through opacity-60";
            default: return "bg-[#fcfcfb] text-stone-500 border-[#e5e3d9]";
        }
    };

    const statusLabel = (status: string) => {
        switch (status) {
            case "SCHEDULED": return "Upcoming";
            case "COMPLETED": return "Completed";
            case "CANCELLED": return "Cancelled";
            default: return status;
        }
    };

    const computedStatus = (b: Booking) => {
        if (b.status === "SCHEDULED" && new Date(b.end_time) < new Date()) {
            return "COMPLETED";
        }
        return b.status;
    };

    const navigate = (direction: number) => {
        let newDate: Date;
        if (view === "week" || view === "list") {
            newDate = direction > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1);
        } else {
            newDate = direction > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
        }
        router.push(`/calendar?view=${view}&date=${newDate.toISOString()}`);
    };

    const switchView = (newView: "week" | "month" | "list") => {
        setView(newView);
        router.push(`/calendar?view=${newView}&date=${currentDate.toISOString()}`);
    };

    const goToToday = () => {
        router.push(`/calendar?view=${view}&date=${new Date().toISOString()}`);
    };

    const renderListView = () => {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

        return (
            <div className="space-y-2">
                {days.map((day, di) => {
                    const dayBookings = bookings
                        .filter(b => isSameDay(new Date(b.start_time), day))
                        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div key={di} className="bg-white rounded-lg border border-[#e5e3d9] overflow-hidden">
                            <div className={`px-5 py-3 border-b flex items-center justify-between ${isToday ? "bg-stone-900 border-stone-900" : "bg-[#fcfcfb] border-[#e5e3d9]"}`}>
                                <div className="flex items-center gap-3">
                                    <span className={`text-base font-semibold ${isToday ? "text-white" : "text-stone-900"}`}>{format(day, "d")}</span>
                                    <span className={`text-sm ${isToday ? "text-white/70" : "text-stone-500"}`}>{format(day, "EEEE, MMM yyyy")}</span>
                                </div>
                                <span className={`text-xs font-medium ${isToday ? "text-white/60" : "text-stone-400"}`}>
                                    {dayBookings.length} booking{dayBookings.length !== 1 ? "s" : ""}
                                </span>
                            </div>

                            {dayBookings.length === 0 ? (
                                <div className="px-5 py-4 text-sm text-stone-400">No bookings</div>
                            ) : (
                                <div className="divide-y divide-[#e4ddd4]">
                                    {dayBookings.map(b => (
                                        <Link
                                            key={b.id}
                                            href={`/bookings/${b.id}`}
                                            className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#fcfcfb] transition-colors duration-150"
                                        >
                                            <div className="text-right min-w-[70px]">
                                                <div className="text-sm font-medium text-stone-900">{format(new Date(b.start_time), "h:mm a")}</div>
                                                <div className="text-xs text-stone-400">{format(new Date(b.end_time), "h:mm a")}</div>
                                            </div>
                                            <div className="w-px h-9 bg-[#e5e3d9]"></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                                    <span className="text-sm font-medium text-stone-900 truncate">{b.attendee_name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                                    <span className="text-xs text-stone-400">{b.event_type_name}</span>
                                                </div>
                                            </div>
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${statusColor(computedStatus(b))}`}>
                                                {statusLabel(computedStatus(b))}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderWeekView = () => {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
        const hours = Array.from({ length: 12 }, (_, i) => i + 7);

        return (
            <div className="bg-white rounded-lg border border-[#e5e3d9] overflow-hidden">
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[#e5e3d9]">
                    <div className="p-2 bg-[#fcfcfb]"></div>
                    {days.map((day, i) => (
                        <div key={i} className={`p-3 text-center border-l border-[#e5e3d9] bg-[#fcfcfb] ${isSameDay(day, new Date()) ? '!bg-stone-900' : ''}`}>
                            <div className={`text-xs font-medium ${isSameDay(day, new Date()) ? 'text-white/70' : 'text-stone-400'}`}>{format(day, "EEE")}</div>
                            <div className={`text-base font-semibold ${isSameDay(day, new Date()) ? 'text-white' : 'text-stone-900'}`}>{format(day, "d")}</div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-[60px_repeat(7,1fr)] max-h-[600px] overflow-y-auto">
                    {hours.map(hour => (
                        <div key={hour} className="contents">
                            <div className="p-2 text-xs text-stone-400 font-medium text-right pr-3 h-16 border-b border-[#e5e3d9] bg-[#fcfcfb]/50">
                                {hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`}
                            </div>
                            {days.map((day, di) => {
                                const dayBookings = bookings.filter(b => {
                                    const bDate = new Date(b.start_time);
                                    return isSameDay(bDate, day) && bDate.getHours() === hour;
                                });
                                return (
                                    <div key={di} className="border-l border-b border-[#e5e3d9] h-16 p-0.5 relative">
                                        {dayBookings.map(b => (
                                            <Link
                                                key={b.id}
                                                href={`/bookings/${b.id}`}
                                                className={`block text-[10px] leading-tight p-1.5 rounded-md border ${statusColor(computedStatus(b))} truncate hover:opacity-80 transition-opacity`}
                                                title={`${b.attendee_name} - ${b.event_type_name}`}
                                            >
                                                <span className="font-semibold">{b.attendee_name}</span>
                                                <br />
                                                <span>{format(new Date(b.start_time), "h:mm a")}</span>
                                            </Link>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const startDay = getDay(monthStart);
        const paddingDays = startDay === 0 ? 6 : startDay - 1;

        return (
            <div className="bg-white rounded-lg border border-[#e5e3d9] overflow-hidden">
                <div className="grid grid-cols-7 border-b border-[#e5e3d9] bg-[#fcfcfb]">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                        <div key={d} className="p-2.5 text-center text-xs font-medium text-stone-500">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7">
                    {Array.from({ length: paddingDays }).map((_, i) => (
                        <div key={`pad-${i}`} className="h-24 border-b border-r border-[#e5e3d9] bg-[#fcfcfb]/30" />
                    ))}
                    {allDays.map((day, i) => {
                        const dayBookings = bookings.filter(b => isSameDay(new Date(b.start_time), day));
                        const isToday = isSameDay(day, new Date());
                        return (
                            <div key={i} className={`h-24 border-b border-r border-[#e5e3d9] p-1.5 ${isToday ? 'bg-stone-50' : ''}`}>
                                <div className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-stone-900 text-white text-[10px]' : 'text-stone-400'}`}>
                                    {format(day, "d")}
                                </div>
                                <div className="space-y-0.5">
                                    {dayBookings.slice(0, 3).map(b => (
                                        <div key={b.id} className={`text-[9px] leading-tight px-1.5 py-0.5 rounded-sm border ${statusColor(computedStatus(b))} truncate`}>
                                            {format(new Date(b.start_time), "h:mm")} {b.attendee_name}
                                        </div>
                                    ))}
                                    {dayBookings.length > 3 && (
                                        <div className="text-[9px] text-stone-400 font-medium px-1">+{dayBookings.length - 3} more</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const dateLabel = () => {
        if (view === "month") return format(currentDate, "MMMM yyyy");
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = addDays(weekStart, 6);
        return `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;
    };

    return (
        <div className="max-w-full space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="font-display text-2xl font-normal text-stone-900">Calendar</h1>
                    <p className="text-stone-400 text-sm mt-0.5">{dateLabel()} · {bookings.length} booking{bookings.length !== 1 ? "s" : ""}</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white border border-[#e5e3d9] rounded-lg p-1">
                        {(["list", "week", "month"] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => switchView(v)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors duration-150 ${view === v ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-900 hover:bg-[#fcfcfb]"}`}
                            >
                                {v === "list" ? "Agenda" : v}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-[#fcfcfb] border border-[#e5e3d9] text-stone-600 transition-colors duration-150 bg-white">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={goToToday} className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-[#fcfcfb] rounded-lg border border-[#e5e3d9] transition-colors duration-150 bg-white">
                            Today
                        </button>
                        <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-[#fcfcfb] border border-[#e5e3d9] text-stone-600 transition-colors duration-150 bg-white">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {view === "list" ? renderListView() : view === "week" ? renderWeekView() : renderMonthView()}
        </div>
    );
}
