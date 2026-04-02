import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Get the selected event type names filter for a tenant.
 * Wrapped with React cache() — deduplicated within a single render tree,
 * so calling this from multiple pages/layouts only hits the DB once per request.
 */
export const getEventTypeFilter = cache(async (tenantId: string): Promise<string[] | undefined> => {
    const connection = await prisma.calConnection.findFirst({
        where: { tenant_id: tenantId, status: "CONNECTED" },
        select: { metadata: true },
    });

    const meta = connection?.metadata as any;
    const selected = meta?.selectedEventTypes;

    if (!selected || !Array.isArray(selected) || selected.length === 0) {
        return undefined;
    }

    return selected;
});
