/**
 * Server-side enrichment for accommodation proposals: given a listing URL,
 * try to pull out a hero image and geographic coordinates by fetching the
 * page HTML and reading common metadata tags.
 *
 * Best-effort: returns null fields when the source doesn't expose them or
 * the request fails. Never throws.
 */

export type LodgingExtraction = {
  imageUrl?: string;
  lat?: number;
  lon?: number;
  title?: string;
};

const FETCH_TIMEOUT_MS = 8_000;

const BROWSER_HEADERS = {
  // Posing as a desktop browser raises our chances against bot-detection
  // heuristics. We're scraping our own users' submitted URLs at low volume.
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

/**
 * Rewrite an Airbnb booking-flow URL to its public listing URL — booking pages
 * are auth-walled and have thin metadata; /rooms/<id> is what we want to scrape.
 */
export function airbnbCanonicalListingUrl(rawUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!/(^|\.)airbnb\./i.test(u.hostname)) return null;
  const m = u.pathname.match(/\/(?:rooms|book\/stays)\/(\d+)/);
  if (!m) return null;
  // Canonicalise the host as airbnb.com so we don't probe locale-specific
  // mirrors that may behave differently (the user's URL was airbnb.dk).
  return `https://www.airbnb.com/rooms/${m[1]}`;
}

export async function extractLodgingMetadata(
  rawUrl: string,
): Promise<LodgingExtraction | null> {
  const listingUrl = airbnbCanonicalListingUrl(rawUrl);
  if (!listingUrl) return null;

  let html: string;
  try {
    const res = await fetch(listingUrl, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[lodging-extract] ${listingUrl} → HTTP ${res.status}`);
      return null;
    }
    html = await res.text();
  } catch (err) {
    console.warn("[lodging-extract] fetch failed:", err);
    return null;
  }

  const out: LodgingExtraction = {};

  const ogImage = matchMeta(html, "og:image");
  if (ogImage) out.imageUrl = ogImage;

  const ogTitle = matchMeta(html, "og:title");
  if (ogTitle) out.title = ogTitle;

  const coords = findGeoCoords(html);
  if (coords) {
    out.lat = coords.lat;
    out.lon = coords.lon;
  }

  return Object.keys(out).length > 0 ? out : null;
}

function matchMeta(html: string, property: string): string | undefined {
  // Try both attribute orders since Airbnb mixes them.
  const re1 = new RegExp(
    `<meta\\s+property=["']${escapeRegex(property)}["']\\s+content=["']([^"']+)["']`,
    "i",
  );
  const re2 = new RegExp(
    `<meta\\s+content=["']([^"']+)["']\\s+property=["']${escapeRegex(property)}["']`,
    "i",
  );
  const m = html.match(re1) ?? html.match(re2);
  if (!m) return undefined;
  return decodeHtmlEntities(m[1]);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/");
}

/**
 * Look for lat/lon in any JSON-LD block on the page. Airbnb listings expose
 * a `LodgingBusiness` / `LocalBusiness` entity with a `geo` property.
 */
function findGeoCoords(html: string): { lat: number; lon: number } | null {
  const blocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const m of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const arr = Array.isArray(data) ? data : [data];
    for (const item of arr) {
      const coords = readGeo(item);
      if (coords) return coords;
    }
  }
  // Fallback: try a meta tag pair that some listings expose.
  const lat = matchMeta(html, "place:location:latitude");
  const lon = matchMeta(html, "place:location:longitude");
  if (lat && lon) {
    const la = Number(lat);
    const lo = Number(lon);
    if (
      Number.isFinite(la) &&
      Number.isFinite(lo) &&
      Math.abs(la) <= 90 &&
      Math.abs(lo) <= 180
    ) {
      return { lat: la, lon: lo };
    }
  }
  return null;
}

function isValidCoord(la: number, lo: number): boolean {
  return (
    Number.isFinite(la) &&
    Number.isFinite(lo) &&
    Math.abs(la) <= 90 &&
    Math.abs(lo) <= 180 &&
    !(la === 0 && lo === 0)
  );
}

function readGeo(node: unknown): { lat: number; lon: number } | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;

  // Top-level latitude/longitude — Airbnb's VacationRental JSON-LD uses this shape.
  const topLa = Number(obj.latitude);
  const topLo = Number(obj.longitude);
  if (isValidCoord(topLa, topLo)) {
    return { lat: topLa, lon: topLo };
  }

  // Nested geo object — the schema.org canonical form.
  const geo = obj.geo as Record<string, unknown> | undefined;
  if (geo && typeof geo === "object") {
    const la = Number(geo.latitude ?? geo.lat);
    const lo = Number(geo.longitude ?? geo.lon ?? geo.lng);
    if (isValidCoord(la, lo)) {
      return { lat: la, lon: lo };
    }
  }

  // Recurse into any nested objects/arrays — schema.org @graph trees can
  // wrap the actual entity multiple levels deep.
  for (const v of Object.values(obj)) {
    if (Array.isArray(v)) {
      for (const item of v) {
        const r = readGeo(item);
        if (r) return r;
      }
    } else if (v && typeof v === "object") {
      const r = readGeo(v);
      if (r) return r;
    }
  }
  return null;
}
