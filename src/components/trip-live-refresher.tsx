"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Subscribes to the SSE event stream for a trip and triggers a soft refresh
 * of the current RSC route on each event. Tiny, mounted once per overview.
 */
export default function TripLiveRefresher({ tripId }: { tripId: string }) {
  const router = useRouter();

  useEffect(() => {
    const es = new EventSource(`/api/trips/${tripId}/events`);
    es.onmessage = (e) => {
      // We don't care about the payload — the RSC re-renders from DB on refresh.
      // Ignore the initial "hello" so we don't refresh on mount.
      try {
        const data = JSON.parse(e.data);
        if (data?.type === "hello") return;
      } catch {
        /* fall through */
      }
      router.refresh();
    };
    return () => es.close();
  }, [tripId, router]);

  return null;
}
