"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { opaqueId, tripId } from "@/lib/ids";

const TRIP_CODE_RE = /^[a-z0-9]{6,20}$/;

function backWithError(message: string): never {
  redirect(`/?error=${encodeURIComponent(message)}`);
}

export async function createTripAction(formData: FormData): Promise<void> {
  const me = await getCurrentUser();
  if (!me) backWithError("Sign in to create a trip.");

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 100) {
    backWithError("Trip name must be 1–100 characters.");
  }

  const trip = await db.trip.create({
    data: {
      id: tripId(),
      name,
      participants: {
        create: { id: opaqueId(), userId: me.id, displayName: me.username },
      },
    },
  });

  redirect(`/trips/${trip.id}`);
}

export async function joinTripAction(formData: FormData): Promise<void> {
  const me = await getCurrentUser();
  if (!me) backWithError("Sign in to join a trip.");

  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  if (!TRIP_CODE_RE.test(code)) {
    backWithError("Trip codes are short lowercase letters/digits.");
  }

  const trip = await db.trip.findUnique({ where: { id: code } });
  if (!trip) backWithError("No trip with that code.");

  // Idempotent — if you're already a participant, just enter the trip.
  const already = await db.participant.findFirst({
    where: { tripId: trip.id, userId: me.id },
    select: { id: true },
  });
  if (!already) {
    await db.participant.create({
      data: {
        id: opaqueId(),
        tripId: trip.id,
        userId: me.id,
        displayName: me.username,
      },
    });
  }

  redirect(`/trips/${trip.id}`);
}
