"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, UserCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface BookingActionsProps {
    bookingId: string;
    type: "schedule" | "pending";
}

export function BookingActions({ bookingId, type }: BookingActionsProps) {
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
            if (res.ok) {
                router.refresh();
            }
        } catch (e) {
            console.error("Action failed:", e);
        } finally {
            setLoading(null);
        }
    };

    if (type === "pending") {
        return (
            <div className="flex items-center gap-2">
                <button
                    onClick={() => handleAction("accept")}
                    disabled={loading !== null}
                    className="flex-1 py-2 bg-accent text-white hover:bg-accent-hover rounded-xl text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                >
                    {loading === "accept" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Accept"}
                </button>
                <button
                    onClick={() => handleAction("cancel")}
                    disabled={loading !== null}
                    className="flex-1 py-2 bg-stone-50 text-stone-600 hover:bg-stone-100 rounded-xl text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                >
                    {loading === "cancel" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Decline"}
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 flex-wrap sm:opacity-0 sm:group-hover:opacity-100">
            <button
                onClick={() => handleAction("confirm")}
                disabled={loading !== null}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl text-xs font-medium disabled:opacity-50"
            >
                {loading === "confirm" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />} Arrived
            </button>
            <button
                onClick={() => handleAction("complete")}
                disabled={loading !== null}
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-50 text-stone-600 hover:bg-stone-100 rounded-xl text-xs font-medium disabled:opacity-50"
            >
                {loading === "complete" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Done
            </button>
            <button
                onClick={() => handleAction("noshow")}
                disabled={loading !== null}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl text-xs font-medium disabled:opacity-50"
            >
                {loading === "noshow" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} No-Show
            </button>
        </div>
    );
}
