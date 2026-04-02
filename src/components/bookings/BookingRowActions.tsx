"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, MoreVertical, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface BookingRowActionsProps {
    bookingId: string;
    status: string;
    originalStatus?: string;
}

export function BookingRowActions({ bookingId, status, originalStatus }: BookingRowActionsProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const router = useRouter();

    const handleAction = async (action: string) => {
        setLoading(action);
        try {
            const res = await fetch(`/api/bookings/${bookingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action })
            });
            if (res.ok) router.refresh();
        } catch (e) {
            console.error("Action failed:", e);
        } finally {
            setLoading(null);
        }
    };

    if (status === "COMPLETED" || status === "CANCELLED") return null;

    return (
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
                onClick={() => handleAction("complete")}
                disabled={loading !== null}
                className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-50 transition-colors"
                title="Mark Complete"
            >
                {loading === "complete" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            </button>
            <button
                onClick={() => handleAction("cancel")}
                disabled={loading !== null}
                className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
                title="Cancel Booking"
            >
                {loading === "cancel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            </button>
            <button
                onClick={() => router.push(`/bookings/${bookingId}`)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-cream-dark rounded-lg transition-colors"
                title="View Details"
            >
                <MoreVertical className="w-4 h-4" />
            </button>
        </div>
    );
}
