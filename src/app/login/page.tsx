import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loginAction } from "./actions";
import WorldMapBackground from "@/components/world-map-background";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await getCurrentUser();
  if (me) redirect("/");

  const { error } = await searchParams;

  return (
    <>
      <WorldMapBackground />
      <div className="relative flex flex-1 items-center justify-center px-4 py-16">
        <div className="reveal glass-card w-full max-w-md p-9 sm:p-10">
          <div className="flex items-center gap-3">
            {/* Tiny compass marker */}
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-[color:var(--map-accent)]"
              aria-hidden
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                opacity="0.5"
              />
              <path
                d="M 12 3 L 14 12 L 12 11 L 10 12 Z"
                fill="currentColor"
              />
              <circle cx="12" cy="12" r="1.2" fill="currentColor" />
            </svg>
            <p className="eyebrow">Returning traveler</p>
          </div>

          <h1 className="font-display mt-3 text-4xl font-light leading-tight text-[color:var(--map-ink)]">
            Welcome <span className="italic">back</span>.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--map-ink)]/70">
            Pick up where your group left off — every pin, vote and itinerary
            exactly as you left it.
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

          <form action={loginAction} className="mt-7 flex flex-col gap-5">
            <Field label="Username" name="username" autoComplete="username" />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
            />

            <button
              type="submit"
              className="group relative mt-2 inline-flex h-12 items-center justify-center overflow-hidden rounded-full px-6 text-sm font-medium tracking-wide text-[color:var(--map-paper)] shadow-lg shadow-[color:var(--map-accent)]/30 transition-transform hover:scale-[1.01]"
              style={{ background: "var(--map-accent)" }}
            >
              <span className="relative z-10">Sign in</span>
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
              No passport yet?
            </p>
            <span
              className="h-px flex-1"
              style={{ background: "color-mix(in oklab, var(--map-ink) 18%, transparent)" }}
            />
          </div>

          <Link
            href="/register"
            className="font-display link-underline mt-4 inline-block text-base italic text-[color:var(--map-ink)] transition-colors hover:text-[color:var(--map-accent)]"
          >
            Create your account →
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
  label: string;
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
