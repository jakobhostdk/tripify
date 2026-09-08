import type { ProposalBooking } from "@/lib/trip-types";

/**
 * Visual banner for an accommodation proposal — the listing hero image next to
 * a tightly-zoomed minimap of where it actually is. Either piece can be
 * missing (e.g. Airbnb's bot defences blocked the page fetch, or there's no
 * geo in the JSON-LD); the component drops gracefully in those cases and
 * renders nothing when neither is available.
 */
export default function LodgingMedia({
  proposalId,
  booking,
}: {
  proposalId: string;
  booking: ProposalBooking | undefined;
}) {
  if (!booking) return null;
  const hasImage = !!booking.imageUrl;
  const hasMap = typeof booking.lat === "number" && typeof booking.lon === "number";
  if (!hasImage && !hasMap) return null;

  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-[3fr_2fr]">
      {hasImage && (
        // Airbnb hero images are wide; clip to a banner-ish aspect.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={booking.imageUrl}
          alt="Listing photo"
          loading="lazy"
          referrerPolicy="no-referrer"
          className="aspect-[16/10] w-full rounded-lg object-cover shadow-sm"
        />
      )}
      {hasMap && (
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/proposals/${proposalId}/map`}
            alt="Listing location map"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Crosshair pin on top of the static map */}
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2"
          >
            <circle
              cx="12"
              cy="12"
              r="8"
              fill="none"
              stroke="var(--map-accent)"
              strokeWidth="1.5"
              opacity="0.6"
              style={{ paintOrder: "stroke", filter: "drop-shadow(0 0 2px white)" }}
            />
            <circle cx="12" cy="12" r="3.5" fill="var(--map-accent)" />
          </svg>
        </div>
      )}
    </div>
  );
}
