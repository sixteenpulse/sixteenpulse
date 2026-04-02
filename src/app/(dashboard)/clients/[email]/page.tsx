import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { format, differenceInMinutes } from "date-fns";
import { ArrowLeft, Mail, Phone, Calendar } from "lucide-react";
import Link from "next/link";
import { extractPhone } from "@/lib/booking-utils";

interface PageProps {
    params: Promise<{ email: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
    const session = await getSession();
    if (!session?.user?.tenant_id) return redirect("/login");

    const decodedEmail = decodeURIComponent((await params).email);

    const bookings = await prisma.booking.findMany({
        where: {
            tenant_id: session.user.tenant_id,
            attendee_email: decodedEmail
        },
        orderBy: { start_time: "desc" }
    });

    if (bookings.length === 0) return notFound();

    const totalVisits = bookings.length;
    let totalRevenue = 0;

    // Sum revenue safely handling nulls
    bookings.forEach(b => {
        if (b.amount) totalRevenue += b.amount;
    });

    const lastVisit = bookings[0].start_time;

    let phone: string | null = null;
    let name = decodedEmail.split("@")[0];

    for (const b of bookings) {
        if (!phone) {
            const extracted = extractPhone(b.metadata as any);
            if (extracted) phone = extracted;
        }
        if (b.attendee_name && b.attendee_name !== decodedEmail) {
            name = b.attendee_name;
        }
    }

    const initials = name.charAt(0).toUpperCase();

    const statusBadge = (status: string, endTime: Date) => {
        let computedStatus = status;
        if (status === "SCHEDULED" && new Date(endTime) < new Date()) {
            computedStatus = "COMPLETED";
        }

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
        <div className="max-w-4xl space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/clients" className="p-2 rounded-lg hover:bg-cream-dark transition-colors duration-150">
                    <ArrowLeft className="w-4 h-4 text-stone-500" />
                </Link>
                <div className="flex-1">
                    <h1 className="font-display text-2xl font-normal text-stone-900">Client Profile</h1>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-[#e5e3d9] overflow-hidden">
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-center border-b border-[#e5e3d9]">
                    <div className="w-20 h-20 rounded-full bg-[#f3f2ee] flex items-center justify-center text-2xl font-semibold text-stone-700 uppercase shrink-0">
                        {initials}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-display text-stone-900">{name}</h2>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 mt-3 text-sm text-stone-600">
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-stone-400" />
                                {decodedEmail}
                            </div>
                            {phone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-stone-400" />
                                    {phone}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 md:p-8 border-b border-[#e5e3d9] bg-cream-dark">
                    <div>
                        <p className="text-xs font-medium text-stone-400 mb-1">Total Visits</p>
                        <p className="text-xl font-medium text-stone-900">{totalVisits}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-stone-400 mb-1">Total Revenue</p>
                        <p className="text-xl font-medium text-emerald-600">${totalRevenue.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-stone-400 mb-1">Last Visit</p>
                        <p className="text-lg font-medium text-stone-900">{format(new Date(lastVisit), "MMM d, yyyy")}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-stone-400 mb-1">Status</p>
                        <p className="text-lg font-medium text-stone-900">{totalVisits > 3 ? "Loyal" : "Active"}</p>
                    </div>
                </div>

                <div>
                    <div className="px-6 md:px-8 py-5 border-b border-[#e5e3d9] bg-[#fcfcfb]">
                        <h3 className="font-medium text-stone-900">Booking History</h3>
                    </div>
                    <div className="divide-y divide-[#e4ddd4]">
                        {bookings.map(b => (
                            <Link key={b.id} href={`/bookings/${b.id}`} className="flex items-center justify-between p-6 px-6 md:px-8 hover:bg-[#fcfcfb] transition-colors duration-150">
                                <div>
                                    <div className="font-medium text-stone-900 text-sm flex items-center gap-2">
                                        {b.event_type_name}
                                        {statusBadge(b.status, b.end_time)}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-stone-500 mt-1.5">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                                            {format(new Date(b.start_time), "MMM d, yyyy 'at' h:mm a")}
                                        </span>
                                        <span className="text-[#d4d1c6]">•</span>
                                        <span>{differenceInMinutes(new Date(b.end_time), new Date(b.start_time))} min</span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    {b.amount != null ? (
                                        <span className="font-medium text-stone-900 text-sm">${b.amount.toFixed(2)}</span>
                                    ) : (
                                        <span className="text-stone-300">—</span>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
