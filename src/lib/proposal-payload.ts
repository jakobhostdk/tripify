import type { ProposalBooking, ProposalPayload } from "@/lib/trip-types";
import { isValidYmd } from "@/lib/dates";

const PROVIDER_RE = /^[a-z0-9_.-]{1,40}$/i;
const LISTING_ID_RE = /^[a-zA-Z0-9_-]{1,80}$/;
const CURRENCY_RE = /^[A-Z]{3}$/;

function toCountedInt(raw: unknown, max: number): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > max || !Number.isInteger(n)) {
    return undefined;
  }
  return n;
}

/**
 * Sanitize a booking object from untrusted input — drops fields that don't
 * match their expected shapes rather than throwing. Returns undefined if
 * nothing useful is left, so we don't store empty `booking: {}` shells.
 */
export function sanitizeBooking(raw: unknown): ProposalBooking | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const b = raw as Record<string, unknown>;

  const out: ProposalBooking = {};

  if (typeof b.provider === "string" && PROVIDER_RE.test(b.provider)) {
    out.provider = b.provider.toLowerCase();
  }
  if (typeof b.listingId === "string" && LISTING_ID_RE.test(b.listingId)) {
    out.listingId = b.listingId;
  }
  if (isValidYmd(b.checkin)) out.checkin = b.checkin as string;
  if (isValidYmd(b.checkout)) out.checkout = b.checkout as string;

  const adults = toCountedInt(b.adults, 50);
  if (adults !== undefined) out.adults = adults;
  const children = toCountedInt(b.children, 50);
  if (children !== undefined) out.children = children;
  const infants = toCountedInt(b.infants, 20);
  if (infants !== undefined) out.infants = infants;
  const pets = toCountedInt(b.pets, 20);
  if (pets !== undefined) out.pets = pets;

  if (typeof b.currency === "string") {
    const upper = b.currency.toUpperCase();
    if (CURRENCY_RE.test(upper)) out.currency = upper;
  }

  if (typeof b.imageUrl === "string") {
    try {
      const u = new URL(b.imageUrl);
      if (u.protocol === "https:") out.imageUrl = u.toString();
    } catch {
      /* drop */
    }
  }

  if (typeof b.lat === "number" && Number.isFinite(b.lat) && b.lat >= -90 && b.lat <= 90) {
    out.lat = b.lat;
  }
  if (typeof b.lon === "number" && Number.isFinite(b.lon) && b.lon >= -180 && b.lon <= 180) {
    out.lon = b.lon;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Encode a payload to JSON for storage in Proposal.payload.
 */
export function encodePayload(payload: ProposalPayload): string {
  return JSON.stringify(payload);
}
