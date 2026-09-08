import { subscribeToTrip, type TripEvent } from "@/lib/events";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

function sseLine(event: TripEvent | { type: "hello" } | { type: "ping" }) {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/trips/[id]/events">,
) {
  const { id: tripId } = await ctx.params;

  // 404 fast if the trip doesn't exist — avoids opening a stream that will
  // never fire and confusing the client.
  const trip = await db.trip.findUnique({ where: { id: tripId }, select: { id: true } });
  if (!trip) return new Response("Not found", { status: 404 });

  let unsubscribe: (() => void) | null = null;
  let keepalive: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(sseLine({ type: "hello" }));

      unsubscribe = subscribeToTrip(tripId, (event) => {
        try {
          controller.enqueue(sseLine(event));
        } catch {
          // controller already closed; subscriber will be cleaned up by cancel()
        }
      });

      // Keepalive comment every 25s — proxies often close idle streams at 30–60s.
      keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          /* closed */
        }
      }, 25_000);

      request.signal.addEventListener("abort", () => {
        unsubscribe?.();
        if (keepalive) clearInterval(keepalive);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      unsubscribe?.();
      if (keepalive) clearInterval(keepalive);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
