import { getTripContext } from "@/lib/trip-context";
import { addMemberAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function ParticipantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { trip, me } = await getTripContext(id);
  const { error, ok } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      {(ok || error) && (
        <FlashBanner kind={ok ? "ok" : "error"} message={ok ?? error ?? ""} />
      )}

      <section>
        <p className="eyebrow">Participants</p>
        <h2 className="font-display mt-1 text-2xl font-light text-[color:var(--map-ink)]">
          Who&apos;s planning with us
        </h2>

        <ul className="mt-4 flex flex-col gap-2">
          {trip.participants.map((p) => (
            <li
              key={p.id}
              className="glass-card flex items-center justify-between px-4 py-3"
            >
              <span className="font-display text-base italic text-[color:var(--map-ink)]">
                {p.displayName}
                {p.userId === me.id && (
                  <span className="ml-2 text-xs font-normal not-italic text-[color:var(--map-ink)]/55">
                    (you)
                  </span>
                )}
              </span>
              <span className="font-mono text-xs text-[color:var(--map-ink)]/55">
                joined {p.joinedAt.toISOString().slice(0, 10)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-card p-5 sm:p-6">
        <p className="eyebrow">Pull someone in</p>
        <p className="mt-1 text-xs text-[color:var(--map-ink)]/65">
          Their username, or the email they registered with.
        </p>
        <form
          action={addMemberAction}
          className="mt-3 flex flex-col gap-3 sm:flex-row"
        >
          <input type="hidden" name="tripId" value={trip.id} />
          <input
            name="identifier"
            type="text"
            required
            autoComplete="off"
            placeholder="username or email"
            className="flex-1 border-b bg-transparent px-1 py-2 font-display text-base text-[color:var(--map-ink)] outline-none placeholder:text-[color:var(--map-ink)]/35 focus:border-[color:var(--map-accent)]"
            style={{
              borderColor:
                "color-mix(in oklab, var(--map-ink) 28%, transparent)",
            }}
          />
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-medium tracking-wide text-[color:var(--map-paper)] shadow-md shadow-[color:var(--map-accent)]/30 transition-transform hover:scale-[1.02]"
            style={{ background: "var(--map-accent)" }}
          >
            Add
          </button>
        </form>
      </section>
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
