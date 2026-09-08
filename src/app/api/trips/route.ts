import { db } from "@/lib/db";
import { opaqueId, tripId } from "@/lib/ids";

export const runtime = "nodejs";

type Body = {
  name?: unknown;
  creatorName?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const creatorName =
    typeof body.creatorName === "string" ? body.creatorName.trim() : "";

  if (!name) return Response.json({ error: "name required" }, { status: 400 });
  if (!creatorName)
    return Response.json({ error: "creatorName required" }, { status: 400 });

  const trip = await db.trip.create({
    data: {
      id: tripId(),
      name,
      participants: {
        create: { id: opaqueId(), displayName: creatorName },
      },
    },
    include: { participants: true },
  });

  return Response.json({
    tripId: trip.id,
    participantId: trip.participants[0]!.id,
    participantName: trip.participants[0]!.displayName,
  });
}
