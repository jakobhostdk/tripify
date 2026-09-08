import { db } from "@/lib/db";
import { getTripContext } from "@/lib/trip-context";
import {
  PROPOSAL_KINDS,
  PROPOSAL_KIND_LABEL,
  type ProposalKind,
  type ProposalPayload,
} from "@/lib/trip-types";
import BookingStrip from "@/components/booking-strip";
import LodgingMedia from "@/components/lodging-media";
import {
  addProposalAction,
  voteAction,
  withdrawVoteAction,
  deleteProposalAction,
} from "../actions";

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

export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { trip, me, myParticipant } = await getTripContext(id);
  const { error, ok } = await searchParams;

  const proposals = await db.proposal.findMany({
    where: { tripId: trip.id },
    include: {
      author: { select: { id: true, displayName: true } },
      votes: {
        include: { participant: { select: { id: true, displayName: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      {(ok || error) && (
        <FlashBanner kind={ok ? "ok" : "error"} message={ok ?? error ?? ""} />
      )}

      <section>
        <p className="eyebrow">Plan together</p>
        <h2 className="font-display mt-1 text-2xl font-light text-[color:var(--map-ink)]">
          Bring something to the table
        </h2>
        <p className="mt-1 max-w-prose text-sm text-[color:var(--map-ink)]/65">
          Add what you&apos;ve found and weigh in on what the others share.
          Everything you do here shows up live on the overview the group is
          watching.
        </p>
      </section>

      {/* Add proposal */}
      {myParticipant && (
        <section className="glass-card p-5 sm:p-6">
          <p className="eyebrow">Add to the table</p>
          <form
            action={addProposalAction}
            className="mt-3 grid grid-cols-1 gap-3"
          >
            <input type="hidden" name="tripId" value={trip.id} />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[150px_1fr]">
              <label className="flex flex-col gap-1">
                <span className="eyebrow">Kind</span>
                <select
                  name="kind"
                  required
                  defaultValue="destination"
                  className="w-full border-b bg-transparent px-1 py-2 font-display text-base text-[color:var(--map-ink)] outline-none focus:border-[color:var(--map-accent)]"
                  style={{
                    borderColor:
                      "color-mix(in oklab, var(--map-ink) 28%, transparent)",
                  }}
                >
                  {PROPOSAL_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {PROPOSAL_KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="eyebrow">What is it</span>
                <input
                  name="title"
                  type="text"
                  required
                  maxLength={140}
                  placeholder="e.g. Hotel Lux in Mitte"
                  className="w-full border-b bg-transparent px-1 py-2 font-display text-base text-[color:var(--map-ink)] outline-none placeholder:text-[color:var(--map-ink)]/35 focus:border-[color:var(--map-accent)]"
                  style={{
                    borderColor:
                      "color-mix(in oklab, var(--map-ink) 28%, transparent)",
                  }}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="eyebrow">Link (optional)</span>
              <input
                name="url"
                type="url"
                placeholder="https://…"
                className="w-full border-b bg-transparent px-1 py-2 font-mono text-sm text-[color:var(--map-ink)] outline-none placeholder:text-[color:var(--map-ink)]/35 focus:border-[color:var(--map-accent)]"
                style={{
                  borderColor:
                    "color-mix(in oklab, var(--map-ink) 28%, transparent)",
                }}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="eyebrow">Why (optional)</span>
              <textarea
                name="notes"
                rows={2}
                maxLength={1000}
                placeholder="A line about why this one"
                className="w-full resize-none border-b bg-transparent px-1 py-2 font-display text-base italic text-[color:var(--map-ink)] outline-none placeholder:text-[color:var(--map-ink)]/35 focus:border-[color:var(--map-accent)]"
                style={{
                  borderColor:
                    "color-mix(in oklab, var(--map-ink) 28%, transparent)",
                }}
              />
            </label>

            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-full px-6 text-sm font-medium tracking-wide text-[color:var(--map-paper)] shadow-md shadow-[color:var(--map-accent)]/30 transition-transform hover:scale-[1.02]"
                style={{ background: "var(--map-accent)" }}
              >
                Put it on the table
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Proposals — same content as Overview but with action surfaces */}
      <section>
        <div className="flex items-baseline justify-between">
          <p className="eyebrow">On the table</p>
          <p className="font-mono text-xs text-[color:var(--map-ink)]/55">
            {proposals.length}{" "}
            {proposals.length === 1 ? "proposal" : "proposals"}
          </p>
        </div>

        {proposals.length === 0 ? (
          <p className="font-display glass-card mt-3 p-8 text-center text-base italic text-[color:var(--map-ink)]/70">
            Nothing on the table yet — start the round above.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {proposals.map((p) => {
              const payload = parsePayload(p.payload);
              const yesVotes = p.votes.filter((v) => v.value === 1);
              const noVotes = p.votes.filter((v) => v.value === -1);
              const myVote = myParticipant
                ? p.votes.find((v) => v.participantId === myParticipant.id)
                    ?.value ?? null
                : null;
              const amAuthor = p.createdBy === myParticipant?.id;

              return (
                <li key={p.id} className="glass-card p-5">
                  {p.kind === "accommodation" && (
                    <LodgingMedia
                      proposalId={p.id}
                      booking={payload.booking}
                    />
                  )}
                  <div className="flex flex-wrap items-start gap-3">
                    <KindBadge kind={p.kind as ProposalKind} />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-xl font-light leading-snug text-[color:var(--map-ink)]">
                        {payload.title}
                      </h3>
                      {payload.notes && (
                        <p className="mt-2 max-w-prose text-sm text-[color:var(--map-ink)]/75">
                          {payload.notes}
                        </p>
                      )}
                      {payload.url && (
                        <a
                          href={payload.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link-underline mt-2 inline-block break-all text-xs text-[color:var(--map-accent)]"
                        >
                          {payload.url}
                        </a>
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
                    {amAuthor && (
                      <form action={deleteProposalAction}>
                        <input type="hidden" name="tripId" value={trip.id} />
                        <input type="hidden" name="proposalId" value={p.id} />
                        <button
                          type="submit"
                          aria-label="Pull from the table"
                          className="rounded-full p-1.5 text-[color:var(--map-ink)]/45 transition-colors hover:bg-[color:var(--map-accent)]/12 hover:text-[color:var(--map-accent)]"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            aria-hidden
                          >
                            <path
                              d="M 6 6 L 18 18 M 18 6 L 6 18"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Where the others stand */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
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

                  {/* Weigh in */}
                  {myParticipant && (
                    <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--map-ink)]/10 pt-4">
                      <span className="eyebrow shrink-0">weigh in</span>
                      <form action={voteAction} className="contents">
                        <input type="hidden" name="tripId" value={trip.id} />
                        <input
                          type="hidden"
                          name="proposalId"
                          value={p.id}
                        />
                        <button
                          type="submit"
                          name="value"
                          value="1"
                          aria-pressed={myVote === 1}
                          className={voteButtonClasses(myVote === 1, "yes")}
                        >
                          <YesIcon />
                          <span>Yes</span>
                        </button>
                        <button
                          type="submit"
                          name="value"
                          value="-1"
                          aria-pressed={myVote === -1}
                          className={voteButtonClasses(myVote === -1, "no")}
                        >
                          <NoIcon />
                          <span>No</span>
                        </button>
                      </form>
                      {myVote !== null && (
                        <form
                          action={withdrawVoteAction}
                          className="contents"
                        >
                          <input
                            type="hidden"
                            name="tripId"
                            value={trip.id}
                          />
                          <input
                            type="hidden"
                            name="proposalId"
                            value={p.id}
                          />
                          <button
                            type="submit"
                            className="ml-auto rounded-full px-3 py-1.5 text-xs text-[color:var(--map-ink)]/55 transition-colors hover:bg-[color:var(--map-ink)]/8 hover:text-[color:var(--map-ink)]"
                          >
                            step back
                          </button>
                        </form>
                      )}
                    </div>
                  )}
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
          border: "color-mix(in oklab, var(--map-accent) 45%, transparent)",
          fg: "var(--map-accent)",
        }
      : {
          bg: "transparent",
          border: "color-mix(in oklab, var(--map-ink) 18%, transparent)",
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

function voteButtonClasses(active: boolean, polarity: "yes" | "no"): string {
  const base =
    "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors";
  if (active && polarity === "yes") {
    return `${base} bg-[color:var(--map-gold)]/30 text-[color:var(--map-ink)] shadow-sm`;
  }
  if (active && polarity === "no") {
    return `${base} bg-[color:var(--map-accent)] text-[color:var(--map-paper)] shadow-sm`;
  }
  return `${base} border border-[color:var(--map-ink)]/25 text-[color:var(--map-ink)]/70 hover:border-[color:var(--map-ink)]/50 hover:text-[color:var(--map-ink)]`;
}

function YesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        d="M 4 12 L 10 18 L 20 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        d="M 6 6 L 18 18 M 18 6 L 6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
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
