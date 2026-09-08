import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/trips/[id]">,
) {
  const { id } = await ctx.params;

  const trip = await db.trip.findUnique({
    where: { id },
    include: {
      participants: { orderBy: { joinedAt: "asc" } },
      proposals: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!trip) return Response.json({ error: "not found" }, { status: 404 });

  return Response.json({
    id: trip.id,
    name: trip.name,
    createdAt: trip.createdAt,
    participants: trip.participants.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      joinedAt: p.joinedAt,
    })),
    proposals: trip.proposals.map((p) => ({
      id: p.id,
      kind: p.kind,
      payload: JSON.parse(p.payload),
      createdBy: p.createdBy,
      createdAt: p.createdAt,
    })),
  });
}
