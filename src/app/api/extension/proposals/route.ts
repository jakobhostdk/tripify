import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { opaqueId } from "@/lib/ids";
import { publishTripEvent } from "@/lib/events";
import {
  PROPOSAL_KINDS,
  type ProposalKind,
  type ProposalPayload,
} from "@/lib/trip-types";
import { sanitizeBooking } from "@/lib/proposal-payload";
import { classifyFit, dateToYmd } from "@/lib/dates";
import { extractLodgingMetadata } from "@/lib/lodging-extract";
import { fetchAndCacheProposalMap } from "@/lib/static-map";

export const runtime = "nodejs";

const VALID_KINDS = new Set<string>(PROPOSAL_KINDS);

type Body = {
  tripId?: unknown;
  kind?: unknown;
  title?: unknown;
  url?: unknown;
  notes?: unknown;
  booking?: unknown;
};

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) {
    return Response.json({ error: "not-signed-in" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const tripId = typeof body.tripId === "string" ? body.tripId.trim() : "";
  const kind = typeof body.kind === "string" ? body.kind.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  if (!tripId) {
    return Response.json({ error: "tripId required" }, { status: 400 });
  }
  if (!VALID_KINDS.has(kind)) {
    return Response.json({ error: "invalid kind" }, { status: 400 });
  }
  if (!title || title.length > 140) {
    return Response.json(
      { error: "title must be 1–140 chars" },
      { status: 400 },
    );
  }

  // Caller must be a participant of this trip.
  const participant = await db.participant.findFirst({
    where: { tripId, userId: me.id },
    select: {
      id: true,
      trip: { select: { targetStartDate: true, targetEndDate: true } },
    },
  });
  if (!participant) {
    return Response.json({ error: "not on this trip" }, { status: 403 });
  }

  let validUrl: string | undefined;
  if (url) {
    try {
      const u = new URL(url);
      if (u.protocol === "http:" || u.protocol === "https:") {
        validUrl = u.toString();
      } else {
        return Response.json({ error: "url must be http(s)" }, { status: 400 });
      }
    } catch {
      return Response.json({ error: "url malformed" }, { status: 400 });
    }
  }

  let booking = sanitizeBooking(body.booking);

  // For accommodation proposals with a URL, try to enrich with a hero image
  // and lat/lon from the listing's metadata. Best-effort — proceeds without
  // these if the upstream blocks us or doesn't expose them.
  if (kind === "accommodation" && validUrl) {
    const enrichment = await extractLodgingMetadata(validUrl);
    if (enrichment) {
      booking = {
        ...(booking ?? {}),
        ...(enrichment.imageUrl ? { imageUrl: enrichment.imageUrl } : {}),
        ...(typeof enrichment.lat === "number" ? { lat: enrichment.lat } : {}),
        ...(typeof enrichment.lon === "number" ? { lon: enrichment.lon } : {}),
      };
    }
  }

  const payload: ProposalPayload = {
    title,
    ...(notes && notes.length <= 1000 ? { notes } : {}),
    ...(validUrl ? { url: validUrl } : {}),
    ...(booking ? { booking } : {}),
  };

  const proposal = await db.proposal.create({
    data: {
      id: opaqueId(),
      tripId,
      kind: kind as ProposalKind,
      payload: JSON.stringify(payload),
      createdBy: participant.id,
    },
    include: { trip: { select: { name: true } } },
  });

  // Warm the minimap cache so the first viewer doesn't pay the Stadia latency.
  // Fire-and-forget — if it fails, /api/proposals/[id]/map will retry on demand.
  if (
    typeof booking?.lat === "number" &&
    typeof booking?.lon === "number"
  ) {
    fetchAndCacheProposalMap(proposal.id, booking.lat, booking.lon).catch(
      (err) => console.error("[extension] proposal map warm failed:", err),
    );
  }

  publishTripEvent({
    type: "proposal.added",
    tripId,
    proposalId: proposal.id,
  });

  // Echo the fit status when the extension provided dates and the trip has
  // a target window — lets the popup tell the user up front.
  const fit = classifyFit(
    booking?.checkin,
    booking?.checkout,
    participant.trip.targetStartDate,
    participant.trip.targetEndDate,
  );

  return Response.json({
    ok: true,
    proposalId: proposal.id,
    tripName: proposal.trip.name,
    fit,
    targetWindow:
      participant.trip.targetStartDate && participant.trip.targetEndDate
        ? {
            from: dateToYmd(participant.trip.targetStartDate),
            to: dateToYmd(participant.trip.targetEndDate),
          }
        : null,
  });
}
