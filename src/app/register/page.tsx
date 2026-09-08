import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getClientIp } from "@/lib/ip";
import { registerAction } from "./actions";
import WorldMapBackground from "@/components/world-map-background";

export const dynamic = "force-dynamic";

const SUGGESTION_WINDOW_MS = 24 * 60 * 60 * 1000;

async function findCoTripifier() {
  const ip = await getClientIp();
  if (ip === "unknown") return null;
  const cutoff = new Date(Date.now() - SUGGESTION_WINDOW_MS);
  return db.user.findFirst({
    where: { signupIp: ip, createdAt: { gt: cutoff } },
    orderBy: { createdAt: "desc" },
    select: { id: true, username: true },
  });
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await getCurrentUser();
  if (me) redirect("/");

  const suggestion = await findCoTripifier();
  const { error } = await searchParams;

  return (
    <>
      <WorldMapBackground />
      <div className="relative flex flex-1 items-center justify-center px-4 py-16">
        <div className="reveal glass-card w-full max-w-md p-9 sm:p-10">
          <div className="flex items-center gap-3">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-[color:var(--map-accent)]"
              aria-hidden
            >
              <circle
                cx="12"
                cy="12"
                r="3"
                fill="currentColor"
                opacity="0.85"
              />
              <circle
                cx="12"
                cy="12"
                r="8.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
                opacity="0.5"
              />
            </svg>
            <p className="eyebrow">Drop your pin</p>
          </div>

          <h1 className="font-display mt-3 text-4xl font-light leading-tight text-[color:var(--map-ink)]">
            Join the <span className="italic">expedition</span>.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--map-ink)]/70">
            Claim a name, a place on the map, and start plotting routes with
            the people around you.
          </p>

          {error && (
            <div
              className="mt-5 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm"
              style={{
                background: "color-mix(in oklab, var(--map-accent) 12%, transparent)",
                borderColor: "color-mix(in oklab, var(--map-accent) 35%, transparent)",
                color: "var(--map-accent)",
              }}
            >
              <span aria-hidden>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form action={registerAction} className="mt-7 flex flex-col gap-5">
            <Field
              label="Traveler name"
              name="username"
              autoComplete="username"
              pattern="[A-Za-z0-9_\-]{3,24}"
              hint="3–24 letters, digits, underscore or hyphen."
            />

            <Field
              label={
                <>
                  Email <span className="font-normal opacity-60">(optional)</span>
                </>
              }
              name="email"
              type="email"
              autoComplete="email"
              required={false}
              hint="So fellow travelers can find you by email."
            />

            <Field
              label="Secret phrase"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              hint="At least 8 characters."
            />

            {suggestion && (
              <div
                className="relative overflow-hidden rounded-xl border p-4"
                style={{
                  background: "color-mix(in oklab, var(--map-gold) 14%, transparent)",
                  borderColor: "color-mix(in oklab, var(--map-gold) 45%, transparent)",
                }}
              >
                {/* Decorative dashed connection line evoking the flight arcs */}
                <svg
                  className="absolute inset-x-3 top-3 h-5 opacity-50"
                  viewBox="0 0 200 20"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M 4 12 Q 100 -2 196 12"
                    stroke="var(--map-accent)"
                    strokeWidth="1"
                    strokeDasharray="3 4"
                  />
                  <circle cx="4" cy="12" r="2" fill="var(--map-accent)" />
                  <circle cx="196" cy="12" r="2" fill="var(--map-accent)" />
                </svg>

                <input type="hidden" name="cotripWith" value={suggestion.id} />

                <p className="mt-6 text-sm text-[color:var(--map-ink)]">
                  <span className="font-display italic">
                    Same network, different traveler:
                  </span>{" "}
                  <span className="font-semibold text-[color:var(--map-accent)]">
                    @{suggestion.username}
                  </span>{" "}
                  just dropped a pin nearby.
                </p>

                <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm text-[color:var(--map-ink)]">
                  <input
                    name="cotripOptIn"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded-sm accent-[color:var(--map-accent)]"
                  />
                  <span>
                    Start a shared trip with{" "}
                    <span className="font-semibold">@{suggestion.username}</span>
                  </span>
                </label>
              </div>
            )}

            <button
              type="submit"
              className="group relative mt-2 inline-flex h-12 items-center justify-center overflow-hidden rounded-full px-6 text-sm font-medium tracking-wide text-[color:var(--map-paper)] shadow-lg shadow-[color:var(--map-accent)]/30 transition-transform hover:scale-[1.01]"
              style={{ background: "var(--map-accent)" }}
            >
              <span className="relative z-10">Set sail</span>
              <span
                aria-hidden
                className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  background:
                    "linear-gradient(90deg, var(--map-accent), var(--map-gold))",
                }}
              />
            </button>
          </form>

          <div className="mt-8 flex items-center gap-3">
            <span
              className="h-px flex-1"
              style={{ background: "color-mix(in oklab, var(--map-ink) 18%, transparent)" }}
            />
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--map-ink)]/55">
              Already a traveler?
            </p>
            <span
              className="h-px flex-1"
              style={{ background: "color-mix(in oklab, var(--map-ink) 18%, transparent)" }}
            />
          </div>

          <Link
            href="/login"
            className="font-display link-underline mt-4 inline-block text-base italic text-[color:var(--map-ink)] transition-colors hover:text-[color:var(--map-accent)]"
          >
            Sign back in →
          </Link>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
  hint,
  pattern,
  minLength,
}: {
  label: React.ReactNode;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
  pattern?: string;
  minLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        pattern={pattern}
        minLength={minLength}
        className="border-b bg-transparent px-1 py-2 font-display text-lg text-[color:var(--map-ink)] outline-none transition-colors placeholder:text-[color:var(--map-ink)]/35 focus:border-[color:var(--map-accent)]"
        style={{ borderColor: "color-mix(in oklab, var(--map-ink) 28%, transparent)" }}
      />
      {hint && <span className="text-xs text-[color:var(--map-ink)]/55">{hint}</span>}
    </label>
  );
}
