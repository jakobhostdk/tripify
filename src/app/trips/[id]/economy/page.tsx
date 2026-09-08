import { db } from "@/lib/db";
import { getTripContext } from "@/lib/trip-context";
import { addBudgetItemAction, deleteBudgetItemAction } from "../actions";
import { BUDGET_CATEGORIES, BUDGET_CATEGORY_LABEL } from "@/lib/budget";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL = BUDGET_CATEGORY_LABEL;

function formatAmount(cents: number, currency: string): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
}

function formatRange(low: number, high: number, currency: string): string {
  if (low === high) return formatAmount(low, currency);
  return `${formatAmount(low, currency)} – ${formatAmount(high, currency)}`;
}

export default async function EconomyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { trip } = await getTripContext(id);
  const { error, ok } = await searchParams;

  const items = await db.budgetItem.findMany({
    where: { tripId: trip.id },
    orderBy: { createdAt: "asc" },
  });

  const participantCount = trip.participants.length;

  // Totals grouped by currency (a multi-currency trip stays separable).
  const totalsByCurrency = new Map<
    string,
    { low: number; high: number; count: number }
  >();
  for (const it of items) {
    const cur = totalsByCurrency.get(it.currency) ?? { low: 0, high: 0, count: 0 };
    cur.low += it.lowCents;
    cur.high += it.highCents;
    cur.count += 1;
    totalsByCurrency.set(it.currency, cur);
  }
  const currencies = Array.from(totalsByCurrency.keys()).sort();

  // Items grouped by category, in the canonical category order.
  const itemsByCategory = new Map<string, typeof items>();
  for (const it of items) {
    const list = itemsByCategory.get(it.category) ?? [];
    list.push(it);
    itemsByCategory.set(it.category, list);
  }

  return (
    <div className="flex flex-col gap-6">
      {(ok || error) && (
        <FlashBanner kind={ok ? "ok" : "error"} message={ok ?? error ?? ""} />
      )}

      <section>
        <p className="eyebrow">Economy</p>
        <h2 className="font-display mt-1 text-2xl font-light text-[color:var(--map-ink)]">
          What this&apos;ll cost us
        </h2>
        <p className="mt-1 max-w-prose text-sm text-[color:var(--map-ink)]/65">
          Sketch the budget together — flights, lodging, food, activities. Use
          ranges where the group&apos;s still unsure; tighten them as the plan
          firms up.
        </p>
      </section>

      {/* Headline: total budget + per-person */}
      {items.length > 0 && (
        <section className="glass-card p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <p className="eyebrow">Trip total</p>
              <ul className="mt-2 flex flex-col gap-1">
                {currencies.map((cur) => {
                  const t = totalsByCurrency.get(cur)!;
                  return (
                    <li
                      key={cur}
                      className="font-display text-2xl italic leading-tight text-[color:var(--map-ink)] sm:text-3xl"
                    >
                      {formatRange(t.low, t.high, cur)}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <p className="eyebrow">
                Per person · {participantCount} {participantCount === 1 ? "traveler" : "travelers"}
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {currencies.map((cur) => {
                  const t = totalsByCurrency.get(cur)!;
                  return (
                    <li
                      key={cur}
                      className="font-display text-2xl italic leading-tight text-[color:var(--map-ink)] sm:text-3xl"
                    >
                      {formatRange(
                        Math.round(t.low / Math.max(1, participantCount)),
                        Math.round(t.high / Math.max(1, participantCount)),
                        cur,
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Add budget item */}
      <section className="glass-card p-5 sm:p-6">
        <p className="eyebrow">Add an estimate</p>
        <form
          action={addBudgetItemAction}
          className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr_110px_110px_90px_auto] sm:items-end"
        >
          <input type="hidden" name="tripId" value={trip.id} />

          <Field label="Category">
            <select
              name="category"
              required
              defaultValue="lodging"
              className="w-full border-b bg-transparent px-1 py-2 font-display text-base text-[color:var(--map-ink)] outline-none focus:border-[color:var(--map-accent)]"
              style={{
                borderColor: "color-mix(in oklab, var(--map-ink) 28%, transparent)",
              }}
            >
              {BUDGET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABEL[cat]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="What">
            <input
              name="description"
              type="text"
              required
              maxLength={200}
              placeholder="e.g. Hotel in Mitte, 3 nights"
              className="w-full border-b bg-transparent px-1 py-2 font-display text-base text-[color:var(--map-ink)] outline-none placeholder:text-[color:var(--map-ink)]/35 focus:border-[color:var(--map-accent)]"
              style={{
                borderColor: "color-mix(in oklab, var(--map-ink) 28%, transparent)",
              }}
            />
          </Field>

          <Field label="Low">
            <input
              name="low"
              type="text"
              inputMode="decimal"
              required
              placeholder="0"
              className="w-full border-b bg-transparent px-1 py-2 font-mono text-base tabular-nums text-[color:var(--map-ink)] outline-none placeholder:text-[color:var(--map-ink)]/35 focus:border-[color:var(--map-accent)]"
              style={{
                borderColor: "color-mix(in oklab, var(--map-ink) 28%, transparent)",
              }}
            />
          </Field>

          <Field label="High">
            <input
              name="high"
              type="text"
              inputMode="decimal"
              placeholder="(same as low)"
              className="w-full border-b bg-transparent px-1 py-2 font-mono text-base tabular-nums text-[color:var(--map-ink)] outline-none placeholder:text-[color:var(--map-ink)]/35 focus:border-[color:var(--map-accent)]"
              style={{
                borderColor: "color-mix(in oklab, var(--map-ink) 28%, transparent)",
              }}
            />
          </Field>

          <Field label="Currency">
            <input
              name="currency"
              type="text"
              defaultValue="EUR"
              maxLength={3}
              pattern="[A-Za-z]{3}"
              required
              className="w-full border-b bg-transparent px-1 py-2 font-mono text-base uppercase tracking-widest text-[color:var(--map-ink)] outline-none focus:border-[color:var(--map-accent)]"
              style={{
                borderColor: "color-mix(in oklab, var(--map-ink) 28%, transparent)",
              }}
            />
          </Field>

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-medium tracking-wide text-[color:var(--map-paper)] shadow-md shadow-[color:var(--map-accent)]/30 transition-transform hover:scale-[1.02]"
            style={{ background: "var(--map-accent)" }}
          >
            Add
          </button>
        </form>
        <p className="mt-3 text-xs text-[color:var(--map-ink)]/55">
          Leave the high blank if you&apos;ve got a firm number.
        </p>
      </section>

      {/* Categorized breakdown */}
      <section>
        <p className="eyebrow">Breakdown</p>

        {items.length === 0 ? (
          <p className="glass-card mt-3 p-6 font-display text-sm italic text-[color:var(--map-ink)]/70">
            Empty budget — start with the biggest unknown.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {BUDGET_CATEGORIES.filter((cat) =>
              itemsByCategory.has(cat),
            ).map((cat) => {
              const catItems = itemsByCategory.get(cat)!;
              const lowSum = catItems.reduce((s, x) => s + x.lowCents, 0);
              const highSum = catItems.reduce((s, x) => s + x.highCents, 0);
              const cur = catItems[0]?.currency ?? "EUR";
              // If a category has mixed currencies, the headline range is rough — show the dominant one.
              return (
                <div key={cat} className="glass-card p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-lg italic text-[color:var(--map-ink)]">
                      {CATEGORY_LABEL[cat]}
                    </h3>
                    <span className="font-mono text-sm tabular-nums text-[color:var(--map-ink)]/70">
                      {formatRange(lowSum, highSum, cur)}
                    </span>
                  </div>
                  <ul className="mt-3 divide-y divide-[color:var(--map-ink)]/10">
                    {catItems.map((it) => (
                      <li
                        key={it.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm text-[color:var(--map-ink)]">
                          {it.description}
                        </span>
                        <span className="font-mono text-sm tabular-nums text-[color:var(--map-ink)]/85">
                          {formatRange(it.lowCents, it.highCents, it.currency)}
                        </span>
                        <form action={deleteBudgetItemAction}>
                          <input type="hidden" name="tripId" value={trip.id} />
                          <input type="hidden" name="itemId" value={it.id} />
                          <button
                            type="submit"
                            aria-label={`Remove ${it.description}`}
                            className="rounded-full p-1.5 text-[color:var(--map-ink)]/45 transition-colors hover:bg-[color:var(--map-accent)]/12 hover:text-[color:var(--map-accent)]"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                              <path
                                d="M 6 6 L 18 18 M 18 6 L 6 18"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="eyebrow">{label}</span>
      {children}
    </label>
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
