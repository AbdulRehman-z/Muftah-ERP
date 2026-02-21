import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
// Use relative path to avoid potential alias resolution issues in some IDEs
import { getDashboardLastUpdateFn } from "../../server-functions/dashboard/get-dashboard-last-update-fn";

/**
 * Smart polling for the admin dashboard.
 * Only invalidates ["admin-dashboard"] queries when server data actually changes,
 * preventing spurious re-renders and dialog dismissals.
 */
export const useDashboardSync = () => {
    const queryClient = useQueryClient();
    const lastUpdateRef = useRef<string | null>(null);

    const { data } = useQuery({
        queryKey: ["dashboard-sync"],
        queryFn: getDashboardLastUpdateFn,
        refetchInterval: 30_000,
        refetchIntervalInBackground: true,
    });

    useEffect(() => {
        // Explicitly cast or check to ensure TS knows the shape if inference fails
        const payload = data as { lastUpdated: string } | undefined;

        if (payload?.lastUpdated) {
            const newUpdate = new Date(payload.lastUpdated).toISOString();

            // Initial load — just store, do NOT invalidate
            if (lastUpdateRef.current === null) {
                lastUpdateRef.current = newUpdate;
                return;
            }

            // Only invalidate if something actually changed on the server
            if (lastUpdateRef.current !== newUpdate) {
                lastUpdateRef.current = newUpdate;
                queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
            }
        }
    }, [data, queryClient]);
};
