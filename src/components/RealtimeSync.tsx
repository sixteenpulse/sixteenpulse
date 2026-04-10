"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const SYNC_INTERVAL_MS = 30 * 1000; // 30 seconds

/**
 * Background sync component:
 * - Syncs immediately on mount (first page load)
 * - Syncs immediately when window regains focus
 * - Then every 30 seconds while open
 * - After each sync, refreshes the page data via router.refresh()
 */
export function RealtimeSync() {
    const router = useRouter();
    const lastSyncRef = useRef<number>(0); // 0 = never synced this session
    const isSyncingRef = useRef(false);
    const connectionIdRef = useRef<string | null>(null);

    const triggerSync = useCallback(async () => {
        // Prevent rapid overlapping syncs -- wait at least 5 seconds between syncs 
        if (isSyncingRef.current || (Date.now() - lastSyncRef.current < 5000)) return;
        
        isSyncingRef.current = true;
        try {
            // Get connection ID (cache it after first fetch)
            if (!connectionIdRef.current) {
                const res = await fetch("/api/tenant");
                if (!res.ok) return;
                const data = await res.json();
                const conn = (data.tenant?.calConnections || []).find((c: any) => c.status === "CONNECTED");
                if (!conn) return;
                connectionIdRef.current = conn.id;
            }

            await fetch("/api/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionId: connectionIdRef.current }),
            });

            lastSyncRef.current = Date.now();
            router.refresh();
        } catch { }
        finally { isSyncingRef.current = false; }
    }, [router]);

    useEffect(() => {
        // Sync immediately on mount
        triggerSync();

        // Sync on interval
        const timer = setInterval(() => {
            triggerSync();
        }, SYNC_INTERVAL_MS);

        // Sync when user focuses the tab again
        const handleFocus = () => {
            if (document.visibilityState === 'visible') {
                triggerSync();
            }
        };

        document.addEventListener("visibilitychange", handleFocus);
        window.addEventListener("focus", handleFocus);

        return () => {
            clearInterval(timer);
            document.removeEventListener("visibilitychange", handleFocus);
            window.removeEventListener("focus", handleFocus);
        };
    }, [triggerSync]);

    return null;
}
