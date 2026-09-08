import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) {
    return Response.json(
      { error: "not-signed-in" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const trips = await db.trip.findMany({
    where: { participants: { some: { userId: me.id } } },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(
    { trips },
    { headers: { "Cache-Control": "no-store" } },
  );
}
