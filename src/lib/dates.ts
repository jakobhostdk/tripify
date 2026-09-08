/**
 * Date utilities — single source of truth for parsing the YYYY-MM-DD strings
 * that extension URLs carry (Airbnb's `checkin`/`checkout` query params, etc.)
 * and for formatting display labels consistently across Plan + Overview.
 */

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidYmd(s: unknown): s is string {
  if (typeof s !== "string" || !YMD_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

export function ymdToDate(s: string): Date {
  // Always interpret as UTC midnight to dodge timezone drift.
  return new Date(`${s}T00:00:00Z`);
}

export function dateToYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(checkin: string, checkout: string): number {
  if (!isValidYmd(checkin) || !isValidYmd(checkout)) return 0;
  const a = ymdToDate(checkin).getTime();
  const b = ymdToDate(checkout).getTime();
  return Math.max(0, Math.round((b - a) / (24 * 60 * 60 * 1000)));
}

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  day: "numeric",
});

const LONG_DATE = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatShortDate(d: Date | string): string {
  const date = typeof d === "string" ? ymdToDate(d) : d;
  return SHORT_DATE.format(date);
}

export function formatLongDate(d: Date | string): string {
  const date = typeof d === "string" ? ymdToDate(d) : d;
  return LONG_DATE.format(date);
}

export function formatDateRange(start: string, end: string): string {
  if (!isValidYmd(start) || !isValidYmd(end)) return "";
  const s = ymdToDate(start);
  const e = ymdToDate(end);
  if (s.getUTCFullYear() === e.getUTCFullYear()) {
    return `${SHORT_DATE.format(s)} – ${formatLongDate(e)}`;
  }
  return `${LONG_DATE.format(s)} – ${LONG_DATE.format(e)}`;
}

export type TargetFit = "fits" | "partial" | "outside" | "no-target";

/**
 * Compare a booking's date range against the trip's target window.
 * - `fits`     — booking is fully inside the target window
 * - `partial`  — they overlap but the booking spills past one or both edges
 * - `outside`  — no overlap at all
 * - `no-target` — the trip has no target dates yet, so there's nothing to fit to
 */
export function classifyFit(
  bookingCheckin: string | undefined,
  bookingCheckout: string | undefined,
  targetStart: Date | null | undefined,
  targetEnd: Date | null | undefined,
): TargetFit {
  if (!targetStart || !targetEnd) return "no-target";
  if (!bookingCheckin || !bookingCheckout) return "no-target";
  if (!isValidYmd(bookingCheckin) || !isValidYmd(bookingCheckout)) return "no-target";

  const ts = targetStart.getTime();
  const te = targetEnd.getTime();
  const bs = ymdToDate(bookingCheckin).getTime();
  const be = ymdToDate(bookingCheckout).getTime();

  if (bs >= ts && be <= te) return "fits";
  if (be < ts || bs > te) return "outside";
  return "partial";
}
