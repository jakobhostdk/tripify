import { db } from "@/lib/db";
import { opaqueId } from "@/lib/ids";
import { publishTripEvent } from "@/lib/events";

export const runtime = "nodejs";

const KNOWN_KINDS = new Set([
  "destination",
  "date_range",
  "activity",
  "accommodation",
]);

type Body = {
  kind?: unknown;
  payload?: unknown;
  participantId?: unknown;
};

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/trips/[id]/proposals">,
) {
  const { id: tripId } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as Body;

  const kind = typeof body.kind === "string" ? body.kind : "";
  const participantId =
    typeof body.participantId === "string" ? body.participantId : "";
  const payload = body.payload;

  if (!KNOWN_KINDS.has(kind))
    return Response.json({ error: "unknown kind" }, { status: 400 });
  if (!participantId)
    return Response.json({ error: "participantId required" }, { status: 400 });
  if (payload === undefined)
    return Response.json({ error: "payload required" }, { status: 400 });

  const participant = await db.participant.findFirst({
    where: { id: participantId, tripId },
    select: { id: true },
  });
  if (!participant)
    return Response.json({ error: "participant not in trip" }, { status: 403 });

  const proposal = await db.proposal.create({
    data: {
      id: opaqueId(),
      tripId,
      kind,
      payload: JSON.stringify(payload),
      createdBy: participant.id,
    },
  });

  publishTripEvent({
    type: "proposal.added",
    tripId,
    proposalId: proposal.id,
  });

  return Response.json({ proposalId: proposal.id });
}
