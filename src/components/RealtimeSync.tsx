"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const SYNC_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Background sync component:
 * - Syncs immediately on mount (first page load)
 * - Then every 2 minutes
 * - After each sync, refreshes the page data via router.refresh()
 *   (this is a soft refresh — no full page reload, just re-fetches server components)
 */
export function RealtimeSync() {
    const router = useRouter();
    const lastSyncRef = useRef<number>(0); // 0 = never synced this session
    const isSyncingRef = useRef(false);
    const connectionIdRef = useRef<string | null>(null);

    const triggerSync = useCallback(async () => {
        if (isSyncingRef.current) return;
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
            // Soft refresh — re-fetches server components without full page reload
            router.refresh();
        } catch { }
        finally { isSyncingRef.current = false; }
    }, [router]);

    useEffect(() => {
        // Sync immediately on mount (first dashboard load)
        triggerSync();

        // Then sync every 2 minutes
        const timer = setInterval(() => {
            triggerSync();
        }, SYNC_INTERVAL_MS);

        return () => clearInterval(timer);
    }, [triggerSync]);

    return null;
}
