"use client";

import { useEffect } from "react";

export function AutoSync({ connectionId }: { connectionId: string }) {
    useEffect(() => {
        if (!connectionId) return;

        // Trigger background sync
        fetch("/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ connectionId })
        }).catch(() => {});
    }, [connectionId]);

    return null; // Invisible component
}
