import { db } from "@/lib/db";
import { opaqueId } from "@/lib/ids";
import { publishTripEvent } from "@/lib/events";

export const runtime = "nodejs";

type Body = { displayName?: unknown };

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/trips/[id]/participants">,
) {
  const { id: tripId } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as Body;
  const displayName =
    typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (!displayName)
    return Response.json({ error: "displayName required" }, { status: 400 });

  const trip = await db.trip.findUnique({ where: { id: tripId }, select: { id: true } });
  if (!trip) return Response.json({ error: "trip not found" }, { status: 404 });

  const participant = await db.participant.create({
    data: { id: opaqueId(), tripId, displayName },
  });

  publishTripEvent({
    type: "participant.joined",
    tripId,
    participantId: participant.id,
  });

  return Response.json({
    participantId: participant.id,
    participantName: participant.displayName,
  });
}
