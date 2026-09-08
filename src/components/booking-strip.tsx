import type { ProposalBooking } from "@/lib/trip-types";
import {
  classifyFit,
  formatDateRange,
  nightsBetween,
} from "@/lib/dates";

type FitVariant = {
  label: string;
  bg: string;
  border: string;
  fg: string;
};

const FIT_STYLES: Record<"fits" | "partial" | "outside", FitVariant> = {
  fits: {
    label: "fits the window",
    bg: "color-mix(in oklab, var(--map-gold) 22%, transparent)",
    border: "color-mix(in oklab, var(--map-gold) 60%, transparent)",
    fg: "var(--map-ink)",
  },
  partial: {
    label: "spills past the window",
    bg: "color-mix(in oklab, var(--map-gold) 14%, transparent)",
    border: "color-mix(in oklab, var(--map-gold) 40%, transparent)",
    fg: "var(--map-ink)",
  },
  outside: {
    label: "outside the window",
    bg: "color-mix(in oklab, var(--map-accent) 14%, transparent)",
    border: "color-mix(in oklab, var(--map-accent) 45%, transparent)",
    fg: "var(--map-accent)",
  },
};

export default function BookingStrip({
  booking,
  targetStartDate,
  targetEndDate,
}: {
  booking: ProposalBooking | undefined;
  targetStartDate: Date | null | undefined;
  targetEndDate: Date | null | undefined;
}) {
  if (!booking) return null;

  const hasDates = booking.checkin && booking.checkout;
  const dateRange = hasDates
    ? formatDateRange(booking.checkin!, booking.checkout!)
    : null;
  const nights = hasDates
    ? nightsBetween(booking.checkin!, booking.checkout!)
    : 0;

  const guests = guestsLabel(booking);

  const fit = classifyFit(
    booking.checkin,
    booking.checkout,
    targetStartDate,
    targetEndDate,
  );

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      {booking.provider && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--map-ink)]/20 bg-[color:var(--map-paper)]/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--map-ink)]/75">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--map-accent)" }}
          />
          {booking.provider}
        </span>
      )}

      {dateRange && (
        <span className="font-display italic text-[color:var(--map-ink)]">
          {dateRange}
        </span>
      )}
      {nights > 0 && (
        <span className="font-mono text-xs text-[color:var(--map-ink)]/65">
          {nights} {nights === 1 ? "night" : "nights"}
        </span>
      )}
      {guests && (
        <span className="font-mono text-xs text-[color:var(--map-ink)]/65">
          {guests}
        </span>
      )}

      {fit !== "no-target" && (
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]"
          style={{
            background: FIT_STYLES[fit].bg,
            borderColor: FIT_STYLES[fit].border,
            color: FIT_STYLES[fit].fg,
          }}
          title={
            fit === "fits"
              ? "Inside the group's target window"
              : fit === "partial"
                ? "Overlaps the target window but spills past one edge"
                : "Doesn't overlap the target window"
          }
        >
          <span aria-hidden>
            {fit === "fits" ? "✓" : fit === "partial" ? "≈" : "✗"}
          </span>
          {FIT_STYLES[fit].label}
        </span>
      )}
    </div>
  );
}

function guestsLabel(b: ProposalBooking): string {
  const parts: string[] = [];
  if (b.adults && b.adults > 0) {
    parts.push(`${b.adults} ${b.adults === 1 ? "adult" : "adults"}`);
  }
  if (b.children && b.children > 0) {
    parts.push(`${b.children} ${b.children === 1 ? "child" : "children"}`);
  }
  if (b.infants && b.infants > 0) {
    parts.push(`${b.infants} ${b.infants === 1 ? "infant" : "infants"}`);
  }
  if (b.pets && b.pets > 0) {
    parts.push(`${b.pets} ${b.pets === 1 ? "pet" : "pets"}`);
  }
  return parts.join(" · ");
}
