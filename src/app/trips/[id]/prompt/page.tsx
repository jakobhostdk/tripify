import { getTripContext } from "@/lib/trip-context";
import { parseDestinationData } from "@/lib/destination";
import { dateToYmd, formatDateRange } from "@/lib/dates";
import {
  regenerateDestinationAction,
  setTripDatesAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function TripPromptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { trip } = await getTripContext(id);
  const { error, ok } = await searchParams;

  const destination = parseDestinationData(trip.destinationData);
  const stale =
    destination && destination.generated_for_name !== trip.name ? true : false;

  return (
    <div className="flex flex-col gap-6">
      {(ok || error) && (
        <FlashBanner kind={ok ? "ok" : "error"} message={ok ?? error ?? ""} />
      )}

      <section className="glass-card p-6 sm:p-8">
        <p className="eyebrow">Trip prompt</p>
        <h2 className="font-display mt-1 text-3xl font-light leading-tight text-[color:var(--map-ink)] sm:text-4xl">
          {trip.name}
        </h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-[color:var(--map-ink)]/65">
          This is the prompt Tripify reads to draft the map you see in the
          background. Tweak it (rename the trip) and re-draft the atlas when it
          doesn&apos;t land.
        </p>

        <div className="mt-5 flex items-center gap-3 text-xs text-[color:var(--map-ink)]/55">
          <span className="eyebrow">code</span>
          <code className="rounded bg-[color:var(--map-ink)]/8 px-2 py-1 font-mono text-[color:var(--map-ink)]">
            {trip.id}
          </code>
          <span className="eyebrow">drafted</span>
          <span className="font-mono text-[color:var(--map-ink)]/70">
            {trip.createdAt.toISOString().slice(0, 10)}
          </span>
        </div>
      </section>

      {/* Target window — used to flag accommodation proposals whose dates don't fit */}
      <section className="glass-card p-6 sm:p-8">
        <div className="flex items-baseline justify-between gap-3">
          <p className="eyebrow">Target window</p>
          {trip.targetStartDate && trip.targetEndDate && (
            <p className="font-display text-base italic text-[color:var(--map-ink)]/75">
              {formatDateRange(
                dateToYmd(trip.targetStartDate),
                dateToYmd(trip.targetEndDate),
              )}
            </p>
          )}
        </div>
        <p className="mt-2 max-w-prose text-sm text-[color:var(--map-ink)]/65">
          The window we&apos;re aiming for. Anything proposed with dates — like
          an Airbnb stay — gets checked against it so the group can see at a
          glance whether it fits.
        </p>

        <form
          action={setTripDatesAction}
          className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <input type="hidden" name="tripId" value={trip.id} />
          <label className="flex flex-col gap-1">
            <span className="eyebrow">From</span>
            <input
              name="targetStartDate"
              type="date"
              defaultValue={
                trip.targetStartDate
                  ? dateToYmd(trip.targetStartDate)
                  : undefined
              }
              className="border-b bg-transparent px-1 py-2 font-mono text-base text-[color:var(--map-ink)] outline-none focus:border-[color:var(--map-accent)]"
              style={{
                borderColor:
                  "color-mix(in oklab, var(--map-ink) 28%, transparent)",
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="eyebrow">To</span>
            <input
              name="targetEndDate"
              type="date"
              defaultValue={
                trip.targetEndDate
                  ? dateToYmd(trip.targetEndDate)
                  : undefined
              }
              className="border-b bg-transparent px-1 py-2 font-mono text-base text-[color:var(--map-ink)] outline-none focus:border-[color:var(--map-accent)]"
              style={{
                borderColor:
                  "color-mix(in oklab, var(--map-ink) 28%, transparent)",
              }}
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-medium tracking-wide text-[color:var(--map-paper)] shadow-md shadow-[color:var(--map-accent)]/30 transition-transform hover:scale-[1.02]"
            style={{ background: "var(--map-accent)" }}
          >
            Save dates
          </button>
        </form>
      </section>

      <section className="glass-card p-6 sm:p-8">
        <div className="flex items-baseline justify-between gap-3">
          <p className="eyebrow">What Tripify understood</p>
          {destination && (
            <p className="font-mono text-[10px] tracking-[0.2em] text-[color:var(--map-ink)]/45">
              drafted{" "}
              {new Date(destination.generated_at).toISOString().slice(0, 10)}
            </p>
          )}
        </div>

        {!destination ? (
          <p className="mt-3 italic text-[color:var(--map-ink)]/70 font-display">
            Tripify is still drafting your atlas…
            <span className="ml-2 text-xs font-normal not-italic text-[color:var(--map-ink)]/50">
              (or no Anthropic key — fallback world map)
            </span>
          </p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <Datum
                label="Destination"
                value={
                  <span className="font-display text-xl italic text-[color:var(--map-ink)]">
                    {destination.destination_name}
                  </span>
                }
              />
              <Datum
                label="Country"
                value={
                  <span className="text-[color:var(--map-ink)]">
                    {destination.country}{" "}
                    <span className="text-[color:var(--map-ink)]/45">
                      ({destination.country_code})
                    </span>
                  </span>
                }
              />
              <Datum
                label="Centroid"
                value={
                  <span className="font-mono text-xs text-[color:var(--map-ink)]/85">
                    {destination.lat.toFixed(4)}°{" "}
                    {destination.lat >= 0 ? "N" : "S"} ·{" "}
                    {destination.lon.toFixed(4)}°{" "}
                    {destination.lon >= 0 ? "E" : "W"}
                  </span>
                }
              />
              <Datum
                label="Mood"
                value={
                  <span className="font-display text-base italic text-[color:var(--map-ink)]/80">
                    {destination.mood}
                  </span>
                }
              />
            </div>

            <div className="mt-6">
              <p className="eyebrow">Landmarks</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {destination.landmarks.map((lm, i) => (
                  <li
                    key={`${lm.name}-${i}`}
                    className="flex items-center gap-2 rounded-full border border-[color:var(--map-ink)]/15 bg-[color:var(--map-paper)]/40 px-3 py-1.5 text-xs"
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: destination.accent_hex || "#8a2828" }}
                    />
                    <span className="font-display italic text-[color:var(--map-ink)]">
                      {lm.name}
                    </span>
                    <span className="text-[color:var(--map-ink)]/45">
                      · {lm.kind}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {stale && (
              <p className="mt-5 rounded-lg border border-[color:var(--map-gold)]/40 bg-[color:var(--map-gold)]/10 p-3 text-xs text-[color:var(--map-ink)]">
                The trip name changed since this was drafted. Re-draft the atlas
                to refresh the map.
              </p>
            )}

            <form action={regenerateDestinationAction} className="mt-6">
              <input type="hidden" name="tripId" value={trip.id} />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[color:var(--map-ink)]/25 bg-[color:var(--map-paper)]/40 px-5 text-sm font-medium text-[color:var(--map-ink)] transition-colors hover:border-[color:var(--map-accent)] hover:text-[color:var(--map-accent)]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path
                    d="M 20 4 V 9 H 15 M 4 20 V 15 H 9 M 5 9 A 8 8 0 0 1 19 8 M 19 15 A 8 8 0 0 1 5 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Re-draft the atlas
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function Datum({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <div className="mt-1">{value}</div>
    </div>
  );
}

function FlashBanner({
  kind,
  message,
}: {
  kind: "ok" | "error";
  message: string;
}) {
  if (kind === "ok") {
    return (
      <div
        className="flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm"
        style={{
          background: "color-mix(in oklab, var(--map-gold) 16%, transparent)",
          borderColor: "color-mix(in oklab, var(--map-gold) 50%, transparent)",
          color: "var(--map-ink)",
        }}
      >
        <span aria-hidden>✓</span>
        <span>{message}</span>
      </div>
    );
  }
  return (
    <div
      className="flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm"
      style={{
        background: "color-mix(in oklab, var(--map-accent) 12%, transparent)",
        borderColor: "color-mix(in oklab, var(--map-accent) 35%, transparent)",
        color: "var(--map-accent)",
      }}
    >
      <span aria-hidden>⚠</span>
      <span>{message}</span>
    </div>
  );
}
