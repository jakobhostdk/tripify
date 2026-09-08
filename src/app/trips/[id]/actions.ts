"use server";

import { promises as fs } from "node:fs";
import path from "node:path";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { opaqueId } from "@/lib/ids";
import { BUDGET_CATEGORIES, type BudgetCategory } from "@/lib/budget";
import { publishTripEvent } from "@/lib/events";
import {
  PROPOSAL_KINDS,
  type ProposalKind,
  type ProposalPayload,
} from "@/lib/trip-types";
import { isValidYmd, ymdToDate } from "@/lib/dates";

const MAP_DIR = process.env.MAP_DIR ?? "/data/maps";

function back(section: string, tripId: string, kind: "ok" | "error", msg: string): never {
  const base = section === "" ? `/trips/${tripId}` : `/trips/${tripId}/${section}`;
  redirect(`${base}?${kind}=${encodeURIComponent(msg)}`);
}

async function requireMyParticipant(tripId: string) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const p = await db.participant.findFirst({
    where: { tripId, userId: me.id },
    select: { id: true },
  });
  return { me, participant: p };
}

/* -------------------------------- Members -------------------------------- */

export async function addMemberAction(formData: FormData): Promise<void> {
  const tripId = String(formData.get("tripId") ?? "").trim();
  const identifierRaw = String(formData.get("identifier") ?? "").trim();
  if (!tripId) redirect("/");

  const { participant } = await requireMyParticipant(tripId);
  if (!participant) back("participants", tripId, "error", "You're not part of this trip.");

  if (!identifierRaw) back("participants", tripId, "error", "Enter a username or email.");

  const isEmail = identifierRaw.includes("@");
  const identifier = isEmail ? identifierRaw.toLowerCase() : identifierRaw;

  const target = await db.user.findFirst({
    where: isEmail ? { email: identifier } : { username: identifier },
  });
  if (!target) {
    back(
      "participants",
      tripId,
      "error",
      isEmail
        ? "No user is registered with that email."
        : "No user is registered with that username.",
    );
  }

  const already = await db.participant.findFirst({
    where: { tripId, userId: target.id },
    select: { id: true },
  });
  if (already) {
    back("participants", tripId, "ok", `${target.username} is already on this trip.`);
  }

  await db.participant.create({
    data: {
      id: opaqueId(),
      tripId,
      userId: target.id,
      displayName: target.username,
    },
  });

  back("participants", tripId, "ok", `Added ${target.username}.`);
}

/* ---------------------------- Target dates ----------------------------- */

export async function setTripDatesAction(formData: FormData): Promise<void> {
  const tripId = String(formData.get("tripId") ?? "").trim();
  const startRaw = String(formData.get("targetStartDate") ?? "").trim();
  const endRaw = String(formData.get("targetEndDate") ?? "").trim();

  if (!tripId) redirect("/");
  const { participant } = await requireMyParticipant(tripId);
  if (!participant) back("prompt", tripId, "error", "You're not part of this trip.");

  // Clearing both — explicit "no target" state.
  if (!startRaw && !endRaw) {
    await db.trip.update({
      where: { id: tripId },
      data: { targetStartDate: null, targetEndDate: null },
    });
    back("prompt", tripId, "ok", "Cleared the target window.");
  }

  if (!isValidYmd(startRaw) || !isValidYmd(endRaw)) {
    back("prompt", tripId, "error", "Both dates need to be valid (YYYY-MM-DD).");
  }
  const start = ymdToDate(startRaw);
  const end = ymdToDate(endRaw);
  if (end.getTime() < start.getTime()) {
    back("prompt", tripId, "error", "End date can't be before the start.");
  }

  await db.trip.update({
    where: { id: tripId },
    data: { targetStartDate: start, targetEndDate: end },
  });

  back("prompt", tripId, "ok", "Target window set.");
}

/* ------------------------- AI destination regen -------------------------- */

export async function regenerateDestinationAction(formData: FormData): Promise<void> {
  const tripId = String(formData.get("tripId") ?? "").trim();
  if (!tripId) redirect("/");

  const { participant } = await requireMyParticipant(tripId);
  if (!participant) back("", tripId, "error", "You're not part of this trip.");

  await db.trip.update({
    where: { id: tripId },
    data: { destinationData: null, mapImageFetchedAt: null },
  });

  // Best-effort delete of the cached PNG so it gets refetched on next render.
  await fs
    .unlink(path.join(MAP_DIR, `${tripId}.png`))
    .catch(() => undefined);

  back("prompt", tripId, "ok", "Atlas re-drafted.");
}

/* ------------------------ Budget planning items ------------------------- */

function parseAmount(raw: string): number | null {
  const normalized = raw.replace(",", ".").trim();
  if (normalized === "") return null;
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return null;
  return Math.round(n * 100);
}

export async function addBudgetItemAction(formData: FormData): Promise<void> {
  const tripId = String(formData.get("tripId") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const lowRaw = String(formData.get("low") ?? "").trim();
  const highRaw = String(formData.get("high") ?? "").trim();
  const currency = String(formData.get("currency") ?? "EUR").trim().toUpperCase();

  if (!tripId) redirect("/");
  const { participant } = await requireMyParticipant(tripId);
  if (!participant) back("economy", tripId, "error", "You're not part of this trip.");

  if (!description || description.length > 200) {
    back("economy", tripId, "error", "Describe the budget item (1–200 chars).");
  }
  if (!BUDGET_CATEGORIES.includes(category as BudgetCategory)) {
    back("economy", tripId, "error", "Pick a category.");
  }

  const lowCents = parseAmount(lowRaw);
  const highCents = parseAmount(highRaw === "" ? lowRaw : highRaw);
  if (lowCents === null) {
    back("economy", tripId, "error", "Low estimate must be a number.");
  }
  if (highCents === null) {
    back("economy", tripId, "error", "High estimate must be a number.");
  }
  if (highCents < lowCents) {
    back("economy", tripId, "error", "High estimate can't be lower than the low.");
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    back("economy", tripId, "error", "Currency must be a 3-letter code (e.g. EUR).");
  }

  await db.budgetItem.create({
    data: {
      id: opaqueId(),
      tripId,
      category,
      description,
      lowCents,
      highCents,
      currency,
    },
  });

  back("economy", tripId, "ok", "Added to the budget.");
}

export async function deleteBudgetItemAction(formData: FormData): Promise<void> {
  const tripId = String(formData.get("tripId") ?? "").trim();
  const itemId = String(formData.get("itemId") ?? "").trim();
  if (!tripId || !itemId) redirect("/");

  const { participant } = await requireMyParticipant(tripId);
  if (!participant) back("economy", tripId, "error", "You're not part of this trip.");

  await db.budgetItem.deleteMany({ where: { id: itemId, tripId } });
  back("economy", tripId, "ok", "Removed.");
}

/* ------------------------- Proposals + voting --------------------------- */

export async function addProposalAction(formData: FormData): Promise<void> {
  const tripId = String(formData.get("tripId") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const urlRaw = String(formData.get("url") ?? "").trim();

  if (!tripId) redirect("/");
  const { participant } = await requireMyParticipant(tripId);
  if (!participant) back("plan", tripId, "error", "You're not part of this trip.");

  if (!PROPOSAL_KINDS.includes(kind as ProposalKind)) {
    back("plan", tripId, "error", "Pick what kind of thing this is.");
  }
  if (!title || title.length > 140) {
    back("plan", tripId, "error", "Give it a short title (1–140 chars).");
  }

  let url: string | undefined;
  if (urlRaw) {
    try {
      const u = new URL(urlRaw);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad scheme");
      url = u.toString();
    } catch {
      back("plan", tripId, "error", "Link must be a valid http(s) URL.");
    }
  }

  // For now the in-app form doesn't capture booking data — only the extension
  // ships it via /api/extension/proposals. Keeping the type wide here so we
  // don't reject it if it ever does.
  const payload: ProposalPayload = {
    title,
    ...(notes && notes.length <= 1000 ? { notes } : {}),
    ...(url ? { url } : {}),
  };

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

  back("plan", tripId, "ok", "On the table.");
}

export async function voteAction(formData: FormData): Promise<void> {
  const tripId = String(formData.get("tripId") ?? "").trim();
  const proposalId = String(formData.get("proposalId") ?? "").trim();
  const valueRaw = String(formData.get("value") ?? "").trim();
  if (!tripId || !proposalId) redirect("/");

  const { participant } = await requireMyParticipant(tripId);
  if (!participant) back("plan", tripId, "error", "You're not part of this trip.");

  const value = valueRaw === "1" ? 1 : valueRaw === "-1" ? -1 : 0;
  if (value === 0) back("plan", tripId, "error", "Vote must be +1 or -1.");

  const proposal = await db.proposal.findFirst({
    where: { id: proposalId, tripId },
    select: { id: true },
  });
  if (!proposal) back("plan", tripId, "error", "That proposal isn't on this trip.");

  await db.vote.upsert({
    where: {
      proposalId_participantId: {
        proposalId,
        participantId: participant.id,
      },
    },
    create: {
      proposalId,
      participantId: participant.id,
      value,
    },
    update: { value },
  });

  publishTripEvent({
    type: "vote.cast",
    tripId,
    proposalId,
    participantId: participant.id,
  });

  back("plan", tripId, "ok", value === 1 ? "Yes." : "No.");
}

export async function withdrawVoteAction(formData: FormData): Promise<void> {
  const tripId = String(formData.get("tripId") ?? "").trim();
  const proposalId = String(formData.get("proposalId") ?? "").trim();
  if (!tripId || !proposalId) redirect("/");

  const { participant } = await requireMyParticipant(tripId);
  if (!participant) back("plan", tripId, "error", "You're not part of this trip.");

  await db.vote.deleteMany({
    where: { proposalId, participantId: participant.id },
  });

  publishTripEvent({
    type: "vote.removed",
    tripId,
    proposalId,
    participantId: participant.id,
  });

  back("plan", tripId, "ok", "Stepped back.");
}

export async function deleteProposalAction(formData: FormData): Promise<void> {
  const tripId = String(formData.get("tripId") ?? "").trim();
  const proposalId = String(formData.get("proposalId") ?? "").trim();
  if (!tripId || !proposalId) redirect("/");

  const { participant } = await requireMyParticipant(tripId);
  if (!participant) back("plan", tripId, "error", "You're not part of this trip.");

  const proposal = await db.proposal.findFirst({
    where: { id: proposalId, tripId, createdBy: participant.id },
    select: { id: true },
  });
  if (!proposal) back("plan", tripId, "error", "Only the proposer can pull it.");

  await db.proposal.delete({ where: { id: proposalId } });

  publishTripEvent({
    type: "proposal.removed",
    tripId,
    proposalId,
  });

  back("plan", tripId, "ok", "Pulled from the table.");
}
