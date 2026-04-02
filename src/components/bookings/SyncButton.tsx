"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export function SyncButton({ connectionId }: { connectionId: string }) {
    const [syncing, setSyncing] = useState(false);
    const router = useRouter();

    const handleSync = async () => {
        if (!connectionId || syncing) return;
        setSyncing(true);
        try {
            await fetch("/api/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionId })
            });
            router.refresh();
        } catch {
            // fail silently or handle error notification
        } finally {
            setTimeout(() => setSyncing(false), 500); // Small delay for visual feedback
        }
    };

    if (!connectionId) return null;

    return (
        <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#e5e3d9] text-stone-600 rounded-lg text-sm font-medium hover:bg-[#fcfcfb] hover:text-stone-900 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Sync Bookings"
        >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync"}
        </button>
    );
}
