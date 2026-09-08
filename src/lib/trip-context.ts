import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";

/**
 * Shared trip + auth fetch. React.cache() dedupes across layout/page within a
 * single request, so the layout shell and the active section page don't each
 * round-trip the database.
 */
export const getTripContext = cache(async (tripId: string) => {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const trip = await db.trip.findUnique({
    where: { id: tripId },
    include: {
      participants: {
        select: { id: true, displayName: true, userId: true, joinedAt: true },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!trip) notFound();

  const myParticipant =
    trip.participants.find((p) => p.userId === me.id) ?? null;

  return { me, trip, myParticipant, isParticipant: !!myParticipant };
});

export type TripContext = Awaited<ReturnType<typeof getTripContext>>;
export type { CurrentUser };
