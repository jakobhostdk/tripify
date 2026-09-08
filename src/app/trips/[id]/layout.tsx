import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { logoutAction } from "@/app/login/actions";
import { getTripContext } from "@/lib/trip-context";
import {
  extractDestination,
  parseDestinationData,
} from "@/lib/destination";
import { fetchAndCacheDestinationMap } from "@/lib/static-map";
import WorldMapBackground from "@/components/world-map-background";
import DestinationMapBackground from "@/components/destination-map-background";
import TripSidebar from "@/components/trip-sidebar";

export const dynamic = "force-dynamic";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { me, trip, isParticipant } = await getTripContext(id);

  if (!isParticipant) {
    return (
      <>
        <WorldMapBackground />
        <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-16">
          <div className="glass-card w-full max-w-md p-7">
            <p className="eyebrow">Locked atlas</p>
            <h1 className="font-display mt-2 text-2xl font-light text-[color:var(--map-ink)]">
              {trip.name}
            </h1>
            <p className="mt-3 text-sm text-[color:var(--map-ink)]/70">
              You aren&apos;t a participant in this trip. Ask a member to add
              you, or use the trip code{" "}
              <code className="font-mono">{trip.id}</code> on the home page.
            </p>
            <Link
              href="/"
              className="link-underline mt-4 inline-block text-sm font-medium text-[color:var(--map-ink)]"
            >
              ← Back to your trips
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Suspense fallback={<WorldMapBackground />}>
        <TripBackground
          tripId={trip.id}
          tripName={trip.name}
          cachedData={trip.destinationData}
          hasCachedMap={!!trip.mapImageFetchedAt}
        />
      </Suspense>

      <div className="relative flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[color:var(--map-ink)]/15 bg-[color:var(--map-paper)]/65 px-6 py-3.5 backdrop-blur-md">
          <div className="flex min-w-0 items-baseline gap-3">
            <Link
              href="/"
              className="font-display shrink-0 text-xl italic text-[color:var(--map-ink)] transition-opacity hover:opacity-80"
            >
              Tripify
            </Link>
            <span
              aria-hidden
              className="text-[color:var(--map-ink)]/35"
            >
              ·
            </span>
            <h1 className="font-display min-w-0 truncate text-xl font-light text-[color:var(--map-ink)]">
              {trip.name}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-3 text-sm text-[color:var(--map-ink)]/70">
            <span className="hidden sm:inline">
              Signed in as{" "}
              <span className="font-medium text-[color:var(--map-ink)]">
                {me.username}
              </span>
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-full border border-[color:var(--map-ink)]/30 px-3 py-1.5 text-sm font-medium text-[color:var(--map-ink)] transition-colors hover:border-[color:var(--map-ink)]"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8 sm:flex-row">
          <aside className="sm:pt-2">
            <TripSidebar tripId={trip.id} />
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </>
  );
}

async function TripBackground({
  tripId,
  tripName,
  cachedData,
  hasCachedMap,
}: {
  tripId: string;
  tripName: string;
  cachedData: string | null;
  hasCachedMap: boolean;
}) {
  const cached = parseDestinationData(cachedData);

  let destination = cached && cached.generated_for_name === tripName ? cached : null;

  if (!destination) {
    const fresh = await extractDestination(tripName);
    if (!fresh) return <WorldMapBackground />;
    destination = fresh;
    await db.trip
      .update({
        where: { id: tripId },
        data: { destinationData: JSON.stringify(fresh) },
      })
      .catch((err) =>
        console.error("[trip] failed to persist destination data:", err),
      );
  }

  let mapImageUrl: string | null = null;
  if (hasCachedMap && cached && cached.generated_for_name === tripName) {
    mapImageUrl = `/api/trips/${tripId}/map?v=${encodeURIComponent(
      destination.generated_at,
    )}`;
  } else {
    const result = await fetchAndCacheDestinationMap(
      tripId,
      destination.lat,
      destination.lon,
      destination.region_radius_deg,
    );
    if (result) {
      await db.trip
        .update({
          where: { id: tripId },
          data: { mapImageFetchedAt: new Date() },
        })
        .catch((err) =>
          console.error("[trip] failed to update mapImageFetchedAt:", err),
        );
      mapImageUrl = `/api/trips/${tripId}/map?v=${encodeURIComponent(
        destination.generated_at,
      )}`;
    }
  }

  return (
    <DestinationMapBackground
      destination={destination}
      mapImageUrl={mapImageUrl}
    />
  );
}
