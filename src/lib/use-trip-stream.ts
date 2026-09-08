"use client";

import { useEffect, useState } from "react";
import type { TripSnapshot } from "./trip-types";

type Status = "loading" | "ready" | "not-found" | "error";

export function useTripStream(tripId: string) {
  const [trip, setTrip] = useState<TripSnapshot | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const res = await fetch(`/api/trips/${tripId}`, { cache: "no-store" });
      if (cancelled) return;
      if (res.status === 404) {
        setStatus("not-found");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const data = (await res.json()) as TripSnapshot;
      if (cancelled) return;
      setTrip(data);
      setStatus("ready");
    }

    refresh();

    const es = new EventSource(`/api/trips/${tripId}/events`);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = () => {
      // V1: refetch the whole trip on any event. Tiny payload; we can apply
      // deltas in-place later if it becomes hot.
      refresh();
    };

    return () => {
      cancelled = true;
      es.close();
    };
  }, [tripId]);

  return { trip, status, connected };
}
