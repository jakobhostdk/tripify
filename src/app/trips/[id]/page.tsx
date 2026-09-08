import { db } from "@/lib/db";
import { getTripContext } from "@/lib/trip-context";
import { parseDestinationData } from "@/lib/destination";
import {
  PROPOSAL_KIND_LABEL,
  type ProposalKind,
  type ProposalPayload,
} from "@/lib/trip-types";
import TripLiveRefresher from "@/components/trip-live-refresher";
import BookingStrip from "@/components/booking-strip";
import LodgingMedia from "@/components/lodging-media";
import LodgingConstellation, {
  type ConstellationLodging,
} from "@/components/lodging-constellation";
import { classifyFit, nightsBetween } from "@/lib/dates";

export const dynamic = "force-dynamic";

function parsePayload(raw: string): ProposalPayload {
  try {
    const p = JSON.parse(raw) as Partial<ProposalPayload>;
    return {
      title: typeof p?.title === "string" ? p.title : "(untitled)",
      notes: typeof p?.notes === "string" ? p.notes : undefined,
      url: typeof p?.url === "string" ? p.url : undefined,
    };
  } catch {
    return { title: raw };
  }
}

function relativeAgo(date: Date): string {
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

// Overview is the shared TV/projector display — read-only. No forms, no buttons,
// no inputs. All interaction lives on the Plan / Participants / Economy pages,
// where individual participants on their own devices contribute. SSE keeps this
// view live as those mutations land.
export default async function OverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { trip, me } = await getTripContext(id);

  const destination = parseDestinationData(trip.destinationData);

  const proposals = await db.proposal.findMany({
    where: { tripId: trip.id },
    include: {
      author: { select: { id: true, displayName: true } },
      votes: {
        include: {
          participant: { select: { id: true, displayName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Collect accommodation proposals with coordinates for the constellation
  // overlay. We need the destination's anchor + radius to project lat/lon
  // into the watercolor map's pixel space.
  const constellationLodgings: ConstellationLodging[] = destination
    ? proposals.flatMap((p): ConstellationLodging[] => {
        if (p.kind !== "accommodation") return [];
        const payload = parsePayload(p.payload);
        const b = payload.booking;
        if (!b || typeof b.lat !== "number" || typeof b.lon !== "number") return [];
        const fit = classifyFit(
          b.checkin,
          b.checkout,
          trip.targetStartDate,
          trip.targetEndDate,
        );
        return [
          {
            id: p.id,
            title: payload.title,
            proposerName: p.author.displayName,
            lat: b.lat,
            lon: b.lon,
            imageUrl: b.imageUrl,
            checkin: b.checkin,
            checkout: b.checkout,
            adults: b.adults,
            children: b.children,
            currency: b.currency,
            nights:
              b.checkin && b.checkout
                ? nightsBetween(b.checkin, b.checkout)
                : undefined,
            fit,
          },
        ];
      })
    : [];

  return (
    <div className="flex flex-col gap-8">
      <TripLiveRefresher tripId={trip.id} />

      {destination && constellationLodgings.length > 0 && (
        <LodgingConstellation
          destinationLat={destination.lat}
          destinationLon={destination.lon}
          regionRadiusDeg={destination.region_radius_deg}
          accentHex={destination.accent_hex}
          lodgings={constellationLodgings}
        />
      )}

      {/* TV-style headline — readable across the room */}
      <section>
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
              style={{ background: "var(--map-accent)" }}
            />
            <span
              className="relative inline-flex h-2.5 w-2.5 rounded-full"
              style={{ background: "var(--map-accent)" }}
            />
          </span>
          <p className="eyebrow">We&apos;re planning together · live</p>
        </div>
        <h2 className="font-display mt-3 text-4xl font-light italic leading-tight text-[color:var(--map-ink)] sm:text-5xl">
          {trip.name}
        </h2>
        {destination && (
          <p className="font-display mt-2 text-base italic text-[color:var(--map-ink)]/70 sm:text-lg">
            {destination.destination_name},{" "}
            <span className="not-italic font-normal opacity-80">
              {destination.country}
            </span>
            <span className="ml-3 font-mono text-xs opacity-50">
              · {destination.mood}
            </span>
          </p>
        )}

        {/* Roll call — who's "here" */}
        <ul className="mt-5 flex flex-wrap gap-2">
          {trip.participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-full border border-[color:var(--map-ink)]/15 bg-[color:var(--map-paper)]/40 px-3 py-1.5"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: "var(--map-accent)" }}
              />
              <span className="font-display text-sm italic text-[color:var(--map-ink)]">
                {p.displayName}
                {p.userId === me.id && (
                  <span className="ml-1 text-xs font-normal not-italic text-[color:var(--map-ink)]/55">
                    (you)
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* What's being considered */}
      <section>
        <div className="flex items-baseline justify-between">
          <p className="eyebrow">On the table</p>
          <p className="font-mono text-xs text-[color:var(--map-ink)]/55">
            {proposals.length}{" "}
            {proposals.length === 1 ? "proposal" : "proposals"}
          </p>
        </div>

        {proposals.length === 0 ? (
          <p className="font-display glass-card mt-3 p-8 text-center text-base italic text-[color:var(--map-ink)]/70 sm:text-lg">
            Nothing on the table yet — the first round of finds is up to us.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {proposals.map((p) => {
              const payload = parsePayload(p.payload);
              const yesVotes = p.votes.filter((v) => v.value === 1);
              const noVotes = p.votes.filter((v) => v.value === -1);

              return (
                <li key={p.id} className="glass-card p-5 sm:p-6">
                  {p.kind === "accommodation" && (
                    <LodgingMedia
                      proposalId={p.id}
                      booking={payload.booking}
                    />
                  )}
                  <div className="flex flex-wrap items-start gap-3">
                    <KindBadge kind={p.kind as ProposalKind} />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-2xl font-light leading-snug text-[color:var(--map-ink)] sm:text-3xl">
                        {payload.title}
                      </h3>
                      {payload.notes && (
                        <p className="mt-2 max-w-prose text-sm text-[color:var(--map-ink)]/75">
                          {payload.notes}
                        </p>
                      )}
                      {payload.url && (
                        <p className="mt-2 break-all text-xs text-[color:var(--map-ink)]/55">
                          {payload.url}
                        </p>
                      )}
                      <BookingStrip
                        booking={payload.booking}
                        targetStartDate={trip.targetStartDate}
                        targetEndDate={trip.targetEndDate}
                      />
                      <p className="mt-3 text-xs text-[color:var(--map-ink)]/55">
                        shared by{" "}
                        <span className="font-display italic text-[color:var(--map-ink)]">
                          {p.author.displayName}
                        </span>{" "}
                        · {relativeAgo(p.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Vote board — every participant's stance, glanceable from across the room */}
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    {trip.participants.map((part) => {
                      const v = p.votes.find(
                        (x) => x.participantId === part.id,
                      );
                      return (
                        <VoteChip
                          key={part.id}
                          displayName={part.displayName}
                          value={v?.value ?? null}
                          isMe={part.userId === me.id}
                        />
                      );
                    })}
                    {(yesVotes.length > 0 || noVotes.length > 0) && (
                      <span className="ml-1 inline-flex items-center gap-2 rounded-full bg-[color:var(--map-ink)]/8 px-2.5 py-1 font-mono text-xs text-[color:var(--map-ink)]/80">
                        <span style={{ color: "var(--map-gold)" }}>
                          +{yesVotes.length}
                        </span>
                        <span className="text-[color:var(--map-ink)]/30">/</span>
                        <span style={{ color: "var(--map-accent)" }}>
                          −{noVotes.length}
                        </span>
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------------- subviews -------------------------------- */

function KindBadge({ kind }: { kind: ProposalKind }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.15em]"
      style={{
        borderColor: "color-mix(in oklab, var(--map-accent) 35%, transparent)",
        background: "color-mix(in oklab, var(--map-accent) 8%, transparent)",
        color: "var(--map-accent)",
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: "var(--map-accent)" }}
      />
      {PROPOSAL_KIND_LABEL[kind] ?? "Other"}
    </span>
  );
}

function VoteChip({
  displayName,
  value,
  isMe,
}: {
  displayName: string;
  value: number | null;
  isMe: boolean;
}) {
  const isYes = value === 1;
  const isNo = value === -1;
  const styles = isYes
    ? {
        bg: "color-mix(in oklab, var(--map-gold) 18%, transparent)",
        border: "color-mix(in oklab, var(--map-gold) 60%, transparent)",
        fg: "var(--map-ink)",
      }
    : isNo
      ? {
          bg: "color-mix(in oklab, var(--map-accent) 12%, transparent)",
          border:
            "color-mix(in oklab, var(--map-accent) 45%, transparent)",
          fg: "var(--map-accent)",
        }
      : {
          bg: "transparent",
          border:
            "color-mix(in oklab, var(--map-ink) 18%, transparent)",
          fg: "color-mix(in oklab, var(--map-ink) 55%, transparent)",
        };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
      style={{ background: styles.bg, borderColor: styles.border, color: styles.fg }}
    >
      <span className="font-display italic">
        {displayName}
        {isMe && (
          <span className="ml-1 text-[10px] font-normal not-italic opacity-70">
            (you)
          </span>
        )}
      </span>
      <span aria-hidden className="font-mono">
        {isYes ? "✓" : isNo ? "✗" : "·"}
      </span>
    </span>
  );
}

