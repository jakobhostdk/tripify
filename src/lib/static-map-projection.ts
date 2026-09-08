/**
 * Pure projection math for Tripify's static (Stamen Watercolor) maps.
 * No Node-only imports, so this module is safe to use from client components.
 */

const STATIC_MAP_W = 1920;
const STATIC_MAP_H = 1080;

export function staticMapDimensions(): { width: number; height: number } {
  return { width: STATIC_MAP_W, height: STATIC_MAP_H };
}

/**
 * Pick a Web-Mercator zoom level that fits a region of ±radiusDeg longitude
 * inside an image of width imgW pixels.
 */
export function staticMapZoom(radiusDeg: number): number {
  const imgW = STATIC_MAP_W;
  const z = Math.log2((imgW * 156543.03) / (2 * radiusDeg * 111320));
  return Math.max(3, Math.min(16, Math.floor(z)));
}

/**
 * Convert (lat, lon) to a pixel offset inside a static map of the given size,
 * centred at (centerLat, centerLon) and rendered at the given zoom.
 * Mirrors the Slippy Map projection so the result aligns with the map image
 * pixel-for-pixel.
 */
export function latLonToImagePx(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number,
  zoom: number,
  imgW: number = STATIC_MAP_W,
  imgH: number = STATIC_MAP_H,
): { x: number; y: number; insideBounds: boolean } {
  const project = (la: number, lo: number) => {
    const scale = 256 * Math.pow(2, zoom);
    const x = ((lo + 180) / 360) * scale;
    const sinLat = Math.sin((la * Math.PI) / 180);
    const y =
      (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
    return { x, y };
  };
  const c = project(centerLat, centerLon);
  const p = project(lat, lon);
  const x = imgW / 2 + (p.x - c.x);
  const y = imgH / 2 + (p.y - c.y);
  return {
    x,
    y,
    insideBounds: x >= 0 && x <= imgW && y >= 0 && y <= imgH,
  };
}
