import { promises as fs } from "node:fs";
import path from "node:path";

// Pure projection helpers live in their own module so client components can
// import them without dragging node:fs into the browser bundle.
export {
  latLonToImagePx,
  staticMapDimensions,
  staticMapZoom,
} from "./static-map-projection";

import {
  staticMapDimensions as _dims,
  staticMapZoom as _zoom,
} from "./static-map-projection";

const STYLE = "stamen_watercolor";
const { width: IMAGE_W, height: IMAGE_H } = _dims();
const MAP_DIR = process.env.MAP_DIR ?? "/data/maps";

export type StaticMapInfo = {
  zoom: number;
  width: number;
  height: number;
};

function mapImagePath(tripId: string): string {
  return path.join(MAP_DIR, `${tripId}.png`);
}

/**
 * Fetch the Stamen Watercolor static map for a destination and persist it to disk.
 * Returns null if the API key is missing or the request fails. Bytes are streamed
 * to disk, not held in memory.
 */
export async function fetchAndCacheDestinationMap(
  tripId: string,
  lat: number,
  lon: number,
  radiusDeg: number,
): Promise<StaticMapInfo | null> {
  const key = process.env.STADIA_API_KEY;
  if (!key) return null;

  const zoom = _zoom(radiusDeg);

  const url = new URL(`https://tiles.stadiamaps.com/static/${STYLE}.png`);
  url.searchParams.set("center", `${lat.toFixed(5)},${lon.toFixed(5)}`);
  url.searchParams.set("zoom", String(zoom));
  url.searchParams.set("size", `${IMAGE_W}x${IMAGE_H}`);
  url.searchParams.set("api_key", key);

  try {
    const res = await fetch(url, {
      headers: { Accept: "image/png" },
      // Stadia static maps render server-side, can be slow — give them time.
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[static-map] HTTP ${res.status} from Stadia:`,
        body.slice(0, 200),
      );
      return null;
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) {
      console.error(`[static-map] non-image response from Stadia (${ct})`);
      return null;
    }

    await fs.mkdir(MAP_DIR, { recursive: true });
    const bytes = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(mapImagePath(tripId), bytes);
    return { zoom, width: IMAGE_W, height: IMAGE_H };
  } catch (err) {
    console.error("[static-map] fetch failed:", err);
    return null;
  }
}

/**
 * Read a cached map PNG from disk. Returns null if it's not been fetched yet.
 */
export async function readCachedMap(tripId: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(mapImagePath(tripId));
  } catch {
    return null;
  }
}

/* ----------------------- Proposal-scale minimaps ----------------------- */

const PROPOSAL_MAP_W = 640;
const PROPOSAL_MAP_H = 400;
const PROPOSAL_MAP_ZOOM = 14;

function proposalMapPath(proposalId: string): string {
  return path.join(MAP_DIR, `proposal-${proposalId}.png`);
}

export async function readCachedProposalMap(
  proposalId: string,
): Promise<Buffer | null> {
  try {
    return await fs.readFile(proposalMapPath(proposalId));
  } catch {
    return null;
  }
}

/**
 * Fetch a tightly-zoomed Stamen Watercolor map for an accommodation proposal
 * at the given coordinates, write it to /data/maps/proposal-{id}.png, and
 * return whether we succeeded.
 */
export async function fetchAndCacheProposalMap(
  proposalId: string,
  lat: number,
  lon: number,
): Promise<boolean> {
  const key = process.env.STADIA_API_KEY;
  if (!key) return false;

  const url = new URL(`https://tiles.stadiamaps.com/static/${STYLE}.png`);
  url.searchParams.set("center", `${lat.toFixed(5)},${lon.toFixed(5)}`);
  url.searchParams.set("zoom", String(PROPOSAL_MAP_ZOOM));
  url.searchParams.set("size", `${PROPOSAL_MAP_W}x${PROPOSAL_MAP_H}`);
  url.searchParams.set("api_key", key);

  try {
    const res = await fetch(url, {
      headers: { Accept: "image/png" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.error(
        `[proposal-map] Stadia HTTP ${res.status} for ${proposalId}`,
      );
      return false;
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) return false;
    await fs.mkdir(MAP_DIR, { recursive: true });
    const bytes = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(proposalMapPath(proposalId), bytes);
    return true;
  } catch (err) {
    console.error("[proposal-map] fetch failed:", err);
    return false;
  }
}
