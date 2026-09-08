import { db } from "@/lib/db";
import {
  fetchAndCacheProposalMap,
  readCachedProposalMap,
} from "@/lib/static-map";
import type { ProposalPayload } from "@/lib/trip-types";

export const runtime = "nodejs";

const ID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!ID_RE.test(id)) return new Response("not found", { status: 404 });

  // Serve from disk if we've already fetched it.
  const cached = await readCachedProposalMap(id);
  if (cached) {
    return new Response(new Uint8Array(cached), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  }

  // Otherwise look up the proposal, see if its payload has coordinates,
  // and fetch+cache on demand.
  const proposal = await db.proposal.findUnique({
    where: { id },
    select: { payload: true },
  });
  if (!proposal) return new Response("not found", { status: 404 });

  let lat: number | undefined;
  let lon: number | undefined;
  try {
    const payload = JSON.parse(proposal.payload) as ProposalPayload;
    if (typeof payload?.booking?.lat === "number") lat = payload.booking.lat;
    if (typeof payload?.booking?.lon === "number") lon = payload.booking.lon;
  } catch {
    return new Response("not found", { status: 404 });
  }
  if (lat === undefined || lon === undefined) {
    return new Response("not found", { status: 404 });
  }

  const ok = await fetchAndCacheProposalMap(id, lat, lon);
  if (!ok) {
    return new Response("upstream unavailable", { status: 502 });
  }

  const bytes = await readCachedProposalMap(id);
  if (!bytes) {
    return new Response("upstream unavailable", { status: 502 });
  }
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
