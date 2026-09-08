import { EventEmitter } from "node:events";

export type TripEvent =
  | { type: "proposal.added"; tripId: string; proposalId: string }
  | { type: "proposal.removed"; tripId: string; proposalId: string }
  | { type: "vote.cast"; tripId: string; proposalId: string; participantId: string }
  | { type: "vote.removed"; tripId: string; proposalId: string; participantId: string }
  | { type: "participant.joined"; tripId: string; participantId: string };

// Single in-process pub/sub. Survives HMR by being cached on globalThis.
//
// Swap path: if/when tripify runs in multiple Node processes (multi-VPS,
// blue/green, etc.), replace this with Postgres LISTEN/NOTIFY — same
// publishTripEvent / subscribeToTrip surface, different transport. Callers
// don't change.
const globalForBus = globalThis as unknown as { tripBus?: EventEmitter };

const bus =
  globalForBus.tripBus ??
  (() => {
    const e = new EventEmitter();
    e.setMaxListeners(0); // many SSE clients per trip; don't warn
    return e;
  })();

if (process.env.NODE_ENV !== "production") {
  globalForBus.tripBus = bus;
}

const channel = (tripId: string) => `trip:${tripId}`;

export function publishTripEvent(event: TripEvent): void {
  bus.emit(channel(event.tripId), event);
}

export function subscribeToTrip(
  tripId: string,
  handler: (event: TripEvent) => void,
): () => void {
  const ch = channel(tripId);
  bus.on(ch, handler);
  return () => bus.off(ch, handler);
}
