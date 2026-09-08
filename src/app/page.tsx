import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { detectChromeFromRequest } from "@/lib/user-agent";
import { logoutAction } from "./login/actions";
import { createTripAction, joinTripAction } from "./trips/actions";
import WorldMapBackground from "@/components/world-map-background";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await getCurrentUser();
  const { error } = await searchParams;

  if (!me) {
    return (
      <>
        <WorldMapBackground />
        <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-24">
          <div className="max-w-2xl text-center">
            <p className="reveal eyebrow" style={{ animationDelay: "0.05s" }}>
              ✦ &nbsp; Lat 0° &nbsp;·&nbsp; Lon 0° &nbsp;·&nbsp; from anywhere &nbsp; ✦
            </p>
            <h1
              className="reveal font-display mt-5 text-[clamp(3.25rem,9vw,6.25rem)] font-light leading-[0.95] text-[color:var(--map-ink)]"
              style={{ animationDelay: "0.15s" }}
            >
              <span className="italic">Trip</span>
              <span style={{ color: "var(--map-accent)" }}>·</span>
              <span>ify</span>
            </h1>
            <p
              className="reveal font-display mx-auto mt-6 max-w-xl text-balance text-lg italic leading-relaxed text-[color:var(--map-ink)]/75 sm:text-xl"
              style={{ animationDelay: "0.25s" }}
            >
              Plan the route together — across living rooms, time zones, and
              whichever screen you happen to be near.
            </p>
            <div
              className="reveal mt-10 flex flex-wrap justify-center gap-3"
              style={{ animationDelay: "0.35s" }}
            >
              <Link
                href="/register"
                className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full px-7 text-sm font-medium tracking-wide text-[color:var(--map-paper)] shadow-lg shadow-[color:var(--map-accent)]/30 transition-transform hover:scale-[1.02]"
                style={{ background: "var(--map-accent)" }}
              >
                <span className="relative z-10">Start a journey</span>
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{
                    background:
                      "linear-gradient(90deg, var(--map-accent), var(--map-gold))",
                  }}
                />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-full border px-7 text-sm font-medium tracking-wide text-[color:var(--map-ink)] backdrop-blur-sm transition-colors hover:bg-[color:var(--map-paper)]/30"
                style={{ borderColor: "color-mix(in oklab, var(--map-ink) 25%, transparent)" }}
              >
                Return to your atlas
              </Link>
            </div>

            {/* Micro-trio: glanceable feature snapshot */}
            <div
              className="reveal mx-auto mt-16 grid max-w-xl grid-cols-1 gap-6 text-left sm:grid-cols-3"
              style={{ animationDelay: "0.5s" }}
            >
              {[
                { k: "01", t: "Gather", d: "Friends drop in from their own screens" },
                { k: "02", t: "Propose", d: "Cities, dates, places — vote in real time" },
                { k: "03", t: "Project", d: "Cast the plan onto the big screen" },
              ].map((step) => (
                <div key={step.k} className="border-t border-[color:var(--map-ink)]/20 pt-3">
                  <div className="eyebrow">{step.k}</div>
                  <div className="font-display mt-1 text-lg text-[color:var(--map-ink)]">
                    {step.t}
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--map-ink)]/65">
                    {step.d}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  const [trips, isChrome] = await Promise.all([
    db.trip.findMany({
      where: { participants: { some: { userId: me.id } } },
      include: { participants: { select: { displayName: true, userId: true } } },
      orderBy: { createdAt: "desc" },
    }),
    detectChromeFromRequest(),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <span className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Tripify</span>
        <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span>
            Signed in as <span className="font-medium text-zinc-950 dark:text-zinc-50">{me.username}</span>
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-950 transition-colors hover:border-zinc-950 dark:border-zinc-700 dark:text-zinc-50 dark:hover:border-zinc-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Pick a trip
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Start one with your people, hop into one you&apos;ve been invited to, or pick up where the group left off.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <form
            action={createTripAction}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div>
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                Start a new trip
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Invite the others once it&apos;s on the map.
              </p>
            </div>
            <input
              name="name"
              type="text"
              required
              maxLength={100}
              placeholder="e.g. Berlin in November"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50"
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Create trip
            </button>
          </form>

          <form
            action={joinTripAction}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div>
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                Join an existing trip
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Ask the organizer for the trip code.
              </p>
            </div>
            <input
              name="code"
              type="text"
              required
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="trip code"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm tracking-wider text-zinc-950 outline-none focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50"
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 px-4 text-sm font-medium text-zinc-950 transition-colors hover:border-zinc-950 dark:border-zinc-700 dark:text-zinc-50 dark:hover:border-zinc-50"
            >
              Join trip
            </button>
          </form>
        </div>

        {isChrome && <ChromeExtensionCallout />}

        <h2 className="mt-12 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Trips we&apos;re planning
        </h2>
        {trips.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
            No shared plans yet — start one above, or join with a code.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {trips.map((trip) => {
              const others = trip.participants
                .filter((p) => p.userId !== me.id)
                .map((p) => p.displayName);
              return (
                <li key={trip.id}>
                  <Link
                    href={`/trips/${trip.id}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-50"
                  >
                    <div>
                      <div className="font-medium text-zinc-950 dark:text-zinc-50">
                        {trip.name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {others.length > 0
                          ? `with ${others.join(", ")}`
                          : "just you so far"}
                      </div>
                    </div>
                    <code className="font-mono text-xs text-zinc-400">{trip.id}</code>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

function ChromeExtensionCallout() {
  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        {/* Editorial-cartography pin glyph */}
        <div
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: "color-mix(in oklab, var(--map-accent) 14%, transparent)",
            color: "var(--map-accent)",
          }}
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8">
            <circle cx="12" cy="12" r="3" fill="currentColor" />
            <circle
              cx="12"
              cy="12"
              r="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              opacity="0.55"
            />
            <circle
              cx="12"
              cy="12"
              r="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.7"
              strokeDasharray="2 3"
              opacity="0.4"
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            Browser extension · for Chrome
          </p>
          <h3 className="mt-1 font-display text-xl font-light italic text-zinc-950 dark:text-zinc-50">
            Catch finds while you browse
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Add any web page straight from the toolbar — the rest of the group
            sees it land on the table.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href="/tripify-extension.zip"
              download="tripify-extension.zip"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium tracking-wide text-white shadow-md transition-transform hover:scale-[1.02]"
              style={{
                background: "var(--map-accent)",
                boxShadow: "0 8px 18px -6px color-mix(in oklab, var(--map-accent) 60%, transparent)",
              }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path
                  d="M 12 4 V 16 M 6 12 L 12 18 L 18 12 M 4 20 H 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Download for Chrome
            </a>
            <details className="group text-sm text-zinc-600 dark:text-zinc-400">
              <summary className="cursor-pointer list-none font-medium underline decoration-zinc-400 underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100">
                How to install
              </summary>
              <ol className="mt-3 max-w-md list-decimal space-y-1.5 pl-5 text-xs text-zinc-600 dark:text-zinc-400">
                <li>
                  Unzip <code className="font-mono">tripify-extension.zip</code>
                </li>
                <li>
                  Open <code className="font-mono">chrome://extensions</code>
                </li>
                <li>Toggle <strong>Developer mode</strong> on (top right)</li>
                <li>
                  Click <strong>Load unpacked</strong> and pick the unzipped folder
                </li>
                <li>
                  Pin the Tripify icon to your toolbar — that&apos;s it
                </li>
              </ol>
            </details>
          </div>
        </div>
      </div>
    </section>
  );
}
