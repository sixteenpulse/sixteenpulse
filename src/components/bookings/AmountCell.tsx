"use client";

import { useState } from "react";

interface AmountCellProps {
    bookingId: string;
    initialAmount: number | null;
}

export function AmountCell({ bookingId, initialAmount }: AmountCellProps) {
    const [amount, setAmount] = useState<string>(initialAmount != null ? initialAmount.toString() : "");
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/bookings/${bookingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: amount || null }),
            });
            if (res.ok) setEditing(false);
        } catch {
            alert("Failed to save amount");
        }
        setSaving(false);
    };

    const handleCancel = () => {
        setAmount(initialAmount != null ? initialAmount.toString() : "");
        setEditing(false);
    };

    if (editing) {
        return (
            <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                <span className="text-sm text-stone-400">$</span>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-20 px-2 py-1.5 text-sm border border-warm bg-warm-white rounded-md focus:outline-none focus:ring-1 focus:ring-[#da7756]/30 focus:border-accent transition-colors"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave();
                        if (e.key === "Escape") handleCancel();
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSave(); }}
                    disabled={saving}
                    className="px-2.5 py-1.5 text-xs bg-accent text-white rounded-md font-medium hover:bg-accent-hover transition-colors"
                >
                    {saving ? "..." : "Save"}
                </button>
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCancel(); }}
                    className="px-2 py-1.5 text-xs border border-warm rounded-md text-stone-400 hover:bg-cream-dark transition-colors"
                >
                    ✕
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditing(true); }}
            title="Click to edit amount"
        >
            {amount ? (
                <span className="text-[13px] font-medium text-stone-900">${parseFloat(amount).toFixed(2)}</span>
            ) : (
                <span className="text-xs border border-dashed border-warm text-stone-400 px-2.5 py-1 rounded-md hover:border-warm-dark transition-colors">+ add</span>
            )}
        </button>
    );
}
