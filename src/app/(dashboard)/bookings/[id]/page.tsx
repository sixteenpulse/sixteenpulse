import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { format, differenceInMinutes } from "date-fns";
import { Calendar, Clock, Mail, User, ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { BookingDetailActions } from "@/components/bookings/BookingDetailActions";
import { BookingLiveDetails } from "@/components/bookings/BookingLiveDetails";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function BookingDetailPage({ params }: PageProps) {
    const session = await getSession();
    if (!session?.user?.tenant_id) return redirect("/login");

    const { id } = await params;

    const booking = await prisma.booking.findFirst({
        where: { id, tenant_id: session.user.tenant_id }
    });

    if (!booking) return notFound();

    const duration = differenceInMinutes(new Date(booking.end_time), new Date(booking.start_time));

    const statusConfig: Record<string, { label: string; cls: string }> = {
        SCHEDULED: { label: "Upcoming", cls: "bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]" },
        COMPLETED: { label: "Completed", cls: "bg-[#f3f2ee] text-stone-600 border border-[#e5e3d9]" },
        CANCELLED: { label: "Cancelled", cls: "bg-red-50 text-red-600 border border-red-200" },
        RESCHEDULED: { label: "Rescheduled", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
        CONFIRMED: { label: "Confirmed", cls: "bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]" },
        OTHER: { label: "Pending", cls: "bg-[#fcfcfb] text-stone-500 border border-[#e5e3d9]" },
    };

    let computedStatus = booking.status;
    if (computedStatus === "SCHEDULED" && new Date(booking.end_time) < new Date()) {
        computedStatus = "COMPLETED";
    }

    const statusObj = statusConfig[computedStatus] || statusConfig.OTHER;

    return (
        <div className="max-w-3xl space-y-5">
            <div className="flex items-center gap-4">
                <Link href="/bookings" className="p-2 rounded-lg hover:bg-cream-dark transition-colors duration-150">
                    <ArrowLeft className="w-4 h-4 text-stone-500" />
                </Link>
                <div className="flex-1">
                    <h1 className="font-display text-2xl font-normal text-stone-900">{booking.attendee_name}</h1>
                </div>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium ${statusObj.cls}`}>
                    {statusObj.label}
                </span>
            </div>

            <div className="bg-warm-white rounded-xl border border-warm overflow-hidden">
                <div className="px-6 py-5 border-b border-[#e4ddd4]">
                    <h2 className="text-base font-medium text-stone-900">{booking.event_type_name}</h2>
                    <p className="text-stone-400 text-xs mt-0.5">ID: {booking.cal_booking_id}</p>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-medium text-stone-400 mb-2.5 block">Date & Time</label>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-accent-light flex items-center justify-center shrink-0">
                                    <Calendar className="w-4 h-4 text-accent" />
                                </div>
                                <div>
                                    <p className="font-medium text-stone-900 text-sm">{format(new Date(booking.start_time), "EEEE, MMMM d, yyyy")}</p>
                                    <p className="text-xs text-stone-400 mt-0.5">
                                        {format(new Date(booking.start_time), "h:mm a")} – {format(new Date(booking.end_time), "h:mm a")}
                                        <span className="ml-1.5">({duration} min)</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-stone-400 mb-2.5 block">Client</label>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-accent-light flex items-center justify-center shrink-0">
                                    <User className="w-4 h-4 text-accent" />
                                </div>
                                <div>
                                    <p className="font-medium text-stone-900 text-sm">{booking.attendee_name}</p>
                                    <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                                        <Mail className="w-3 h-3" /> {booking.attendee_email}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-medium text-stone-400 mb-2.5 block">Host</label>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-cream-dark flex items-center justify-center text-stone-600 font-semibold text-sm shrink-0">
                                    {booking.host_name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-medium text-stone-900 text-sm">{booking.host_name}</p>
                                    <p className="text-xs text-stone-400 mt-0.5">{booking.host_email}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-stone-400 mb-2.5 block">Service</label>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-cream-dark flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4 text-stone-500" />
                                </div>
                                <div>
                                    <p className="font-medium text-stone-900 text-sm">{booking.event_type_name}</p>
                                    <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                                        <Clock className="w-3 h-3" /> {duration} minutes
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <BookingLiveDetails bookingId={booking.id} />

                {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
                    <div className="p-6 border-t border-[#e4ddd4] bg-cream-dark">
                        <BookingDetailActions bookingId={booking.id} status={booking.status} />
                    </div>
                )}
            </div>
        </div>
    );
}
