"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
    bookingId: string;
    status: string;
}

export function BookingDetailActions({ bookingId, status }: Props) {
    const [loading, setLoading] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState("");
    const [showCancelForm, setShowCancelForm] = useState(false);
    const router = useRouter();

    const handleAction = async (action: string, extra?: Record<string, string>) => {
        setLoading(action);
        try {
            const res = await fetch(`/api/bookings/${bookingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, ...extra })
            });
            if (res.ok) {
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || "Action failed");
            }
        } catch {
            alert("Network error");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="space-y-3">
            <p className="text-xs font-medium text-stone-400">Actions</p>
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => handleAction("complete")}
                    disabled={loading !== null}
                    className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover flex items-center gap-2 disabled:opacity-50 transition-colors duration-150"
                >
                    {loading === "complete" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Mark Complete
                </button>

                <button
                    onClick={() => handleAction("noshow")}
                    disabled={loading !== null}
                    className="px-4 py-2 rounded-lg bg-warm-white border border-warm text-stone-600 text-sm font-medium hover:bg-cream-dark flex items-center gap-2 disabled:opacity-50 transition-colors duration-150"
                >
                    {loading === "noshow" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    No-Show
                </button>

                {!showCancelForm ? (
                    <button
                        onClick={() => setShowCancelForm(true)}
                        className="px-4 py-2 rounded-lg bg-red-50 text-red-500 text-sm font-medium hover:bg-red-100 border border-red-100 transition-colors duration-150"
                    >
                        Cancel Booking
                    </button>
                ) : (
                    <div className="w-full flex items-center gap-2 mt-1">
                        <input
                            type="text"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Reason (optional)..."
                            className="flex-1 bg-warm-white border border-warm rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#da7756]/30 focus:border-accent transition-colors"
                        />
                        <button
                            onClick={() => handleAction("cancel", { reason: cancelReason })}
                            disabled={loading !== null}
                            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
                        >
                            {loading === "cancel" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                        </button>
                        <button
                            onClick={() => setShowCancelForm(false)}
                            className="px-4 py-2 rounded-lg bg-cream-dark text-stone-600 text-sm hover:bg-[#ddd8ce] transition-colors"
                        >
                            Back
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
