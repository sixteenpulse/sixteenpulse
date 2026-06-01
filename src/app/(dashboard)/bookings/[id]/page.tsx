import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { format, differenceInMinutes } from "date-fns";
import { Calendar, Clock, Mail, User, ArrowLeft, FileText, DollarSign } from "lucide-react";
import Link from "next/link";
import { BookingDetailActions } from "@/components/bookings/BookingDetailActions";
import { BookingLiveDetails } from "@/components/bookings/BookingLiveDetails";
import { AmountCell } from "@/components/bookings/AmountCell";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function BookingDetailPage({ params }: PageProps) {
    const session = await getSession();
    if (!session?.user?.tenant_id) return redirect("/login");

    const { id } = await params;

    const booking = await prisma.booking.findFirst({
        where: { id, tenant_id: session.user.tenant_id },
        include: { tenant: { select: { currency: true } } }
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
                <div className="px-6 py-5 border-b border-[#e4ddd4] bg-[#faf9f8]">
                    <h2 className="text-base font-medium text-stone-900">Booking Details</h2>
                    <p className="text-stone-500 text-xs mt-0.5">ID: {booking.cal_booking_id}</p>
                </div>

                <div className="divide-y divide-[#e4ddd4]">
                    {/* Date & Time */}
                    <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6 hover:bg-[#fcfcfb] transition-colors">
                        <p className="text-[13px] font-medium text-stone-500 w-full sm:w-48 shrink-0">Date & Time</p>
                        <div className="flex-1">
                            <p className="text-[13px] font-medium text-stone-900">{format(new Date(booking.start_time), "EEEE, MMMM d, yyyy")}</p>
                            <p className="text-[13px] text-stone-500 mt-0.5">{format(new Date(booking.start_time), "h:mm a")} – {format(new Date(booking.end_time), "h:mm a")} ({duration} min)</p>
                        </div>
                    </div>

                    {/* Client */}
                    <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6 hover:bg-[#fcfcfb] transition-colors">
                        <p className="text-[13px] font-medium text-stone-500 w-full sm:w-48 shrink-0">Client</p>
                        <div className="flex-1">
                            <p className="text-[13px] font-medium text-stone-900">{booking.attendee_name}</p>
                            <p className="text-[13px] text-stone-500 mt-0.5">{booking.attendee_email}</p>
                        </div>
                    </div>

                    {/* Service */}
                    <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6 hover:bg-[#fcfcfb] transition-colors">
                        <p className="text-[13px] font-medium text-stone-500 w-full sm:w-48 shrink-0">Service</p>
                        <p className="text-[13px] font-medium text-stone-900 flex-1 leading-relaxed">{booking.event_type_name}</p>
                    </div>

                    {/* Host */}
                    <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6 hover:bg-[#fcfcfb] transition-colors">
                        <p className="text-[13px] font-medium text-stone-500 w-full sm:w-48 shrink-0">Host</p>
                        <p className="text-[13px] font-medium text-stone-900 flex-1 leading-relaxed">{booking.host_name}</p>
                    </div>

                    {/* Custom Amount */}
                    <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 hover:bg-[#fcfcfb] transition-colors">
                        <p className="text-[13px] font-medium text-stone-500 w-full sm:w-48 shrink-0">Pricing</p>
                        <div className="flex-1">
                            <AmountCell bookingId={booking.id} initialAmount={booking.amount} currency={booking.tenant?.currency || "USD"} />
                        </div>
                    </div>

                    <BookingLiveDetails bookingId={booking.id} />
                </div>

                {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
                    <div className="p-6 border-t border-[#e4ddd4] bg-cream-dark">
                        <BookingDetailActions bookingId={booking.id} status={booking.status} />
                    </div>
                )}
            </div>
        </div>
    );
}
