import type { CSSProperties } from "react";

/**
 * Editorial vintage-atlas background. Hand-drawn continent silhouettes on a
 * faint graticule, with pulsing landmark pins, drifting animal pictograms,
 * dashed great-circle flight arcs, and paper planes traveling along them
 * via SMIL motion paths. Renders as a Server Component (no client JS needed).
 */

const W = 1000;
const H = 500;

// Equirectangular projection. 1° = 2.778 SVG units in both axes.
const project = (lat: number, lon: number) => ({
  x: ((lon + 180) / 360) * W,
  y: ((90 - lat) / 180) * H,
});

type Marker = {
  name: string;
  lat: number;
  lon: number;
  glyph: string;
  size?: number;
};

const LANDMARKS: Marker[] = [
  { name: "Eiffel Tower", lat: 48.86, lon: 2.3, glyph: "g-eiffel" },
  { name: "Stonehenge", lat: 51.18, lon: -1.83, glyph: "g-stones" },
  { name: "Statue of Liberty", lat: 40.69, lon: -74.04, glyph: "g-statue" },
  { name: "Christ the Redeemer", lat: -22.95, lon: -43.21, glyph: "g-christ" },
  { name: "Pyramids of Giza", lat: 29.98, lon: 31.13, glyph: "g-pyramid" },
  { name: "Taj Mahal", lat: 27.18, lon: 78.04, glyph: "g-dome" },
  { name: "Great Wall", lat: 40.43, lon: 116.57, glyph: "g-wall" },
  { name: "Sydney Opera House", lat: -33.86, lon: 151.21, glyph: "g-opera" },
  { name: "Mount Fuji", lat: 35.36, lon: 138.73, glyph: "g-mountain" },
  { name: "Machu Picchu", lat: -13.16, lon: -72.55, glyph: "g-ruins" },
];

const ANIMALS: Marker[] = [
  { name: "Polar Bear", lat: 76, lon: -42, glyph: "a-bear" },
  { name: "Penguin", lat: -72, lon: 25, glyph: "a-penguin" },
  { name: "Elephant", lat: -3, lon: 36, glyph: "a-elephant" },
  { name: "Kangaroo", lat: -25, lon: 134, glyph: "a-kangaroo" },
  { name: "Panda", lat: 31, lon: 104, glyph: "a-panda" },
  { name: "Whale", lat: 8, lon: -148, glyph: "a-whale" },
  { name: "Camel", lat: 22, lon: 4, glyph: "a-camel" },
  { name: "Reindeer", lat: 66, lon: 25, glyph: "a-reindeer" },
];

const FLIGHTS: { from: string; to: string; lift: number; withPlane?: boolean }[] = [
  { from: "Eiffel Tower", to: "Statue of Liberty", lift: 0.22, withPlane: true },
  { from: "Taj Mahal", to: "Sydney Opera House", lift: 0.28, withPlane: true },
  { from: "Christ the Redeemer", to: "Pyramids of Giza", lift: 0.30 },
  { from: "Mount Fuji", to: "Stonehenge", lift: 0.18, withPlane: true },
  { from: "Machu Picchu", to: "Great Wall", lift: 0.32 },
];

// Hand-tuned twinkles scattered across oceans, biased away from continents.
const TWINKLES: { x: number; y: number; r: number; d: number; t: number }[] = [
  { x: 90, y: 200, r: 0.7, d: 0.0, t: 3.4 },
  { x: 60, y: 260, r: 0.5, d: 1.2, t: 2.8 },
  { x: 150, y: 320, r: 0.8, d: 0.5, t: 4.1 },
  { x: 90, y: 380, r: 0.6, d: 2.1, t: 3.2 },
  { x: 220, y: 310, r: 0.4, d: 1.5, t: 2.4 },
  { x: 170, y: 410, r: 0.7, d: 0.8, t: 3.6 },
  { x: 250, y: 270, r: 0.5, d: 1.8, t: 2.9 },
  { x: 370, y: 200, r: 0.6, d: 0.3, t: 4.0 },
  { x: 405, y: 290, r: 0.8, d: 1.9, t: 3.3 },
  { x: 360, y: 350, r: 0.5, d: 2.4, t: 2.6 },
  { x: 430, y: 400, r: 0.7, d: 0.6, t: 3.7 },
  { x: 450, y: 250, r: 0.5, d: 1.7, t: 2.3 },
  { x: 605, y: 300, r: 0.6, d: 0.4, t: 3.5 },
  { x: 660, y: 360, r: 0.7, d: 1.7, t: 4.2 },
  { x: 720, y: 410, r: 0.5, d: 0.9, t: 2.7 },
  { x: 770, y: 290, r: 0.8, d: 2.3, t: 3.1 },
  { x: 750, y: 350, r: 0.5, d: 1.1, t: 3.8 },
  { x: 870, y: 230, r: 0.6, d: 0.2, t: 4.3 },
  { x: 940, y: 320, r: 0.7, d: 1.4, t: 2.8 },
  { x: 900, y: 410, r: 0.5, d: 2.0, t: 3.4 },
  { x: 960, y: 180, r: 0.6, d: 0.7, t: 3.0 },
  { x: 30, y: 350, r: 0.7, d: 0.5, t: 4.4 },
  { x: 60, y: 430, r: 0.5, d: 2.2, t: 2.5 },
  { x: 510, y: 380, r: 0.8, d: 0.1, t: 3.9 },
  { x: 540, y: 230, r: 0.5, d: 1.6, t: 2.6 },
  { x: 350, y: 90, r: 0.6, d: 0.8, t: 3.6 },
  { x: 560, y: 75, r: 0.5, d: 2.5, t: 2.9 },
  { x: 710, y: 95, r: 0.7, d: 0.4, t: 4.0 },
  { x: 850, y: 90, r: 0.5, d: 1.0, t: 3.3 },
  { x: 200, y: 75, r: 0.6, d: 1.8, t: 2.7 },
  { x: 480, y: 460, r: 0.5, d: 1.3, t: 3.5 },
  { x: 320, y: 460, r: 0.6, d: 0.6, t: 3.8 },
  { x: 700, y: 460, r: 0.5, d: 2.1, t: 2.4 },
];

function flightPath(
  a: { x: number; y: number },
  b: { x: number; y: number },
  lift: number,
): string {
  const dx = b.x - a.x;
  const cx = (a.x + b.x) / 2;
  const cy = Math.min(a.y, b.y) - Math.abs(dx) * lift;
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(
    1,
  )} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

export default function WorldMapBackground() {
  const landmarkByName = new Map(LANDMARKS.map((l) => [l.name, l]));
  const flights = FLIGHTS.map((f, i) => {
    const from = landmarkByName.get(f.from)!;
    const to = landmarkByName.get(f.to)!;
    const a = project(from.lat, from.lon);
    const b = project(to.lat, to.lon);
    return {
      i,
      d: flightPath(a, b, f.lift),
      duration: 18 + i * 6,
      withPlane: f.withPlane ?? false,
      offset: i * 4,
    };
  });

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={
        {
          background:
            "radial-gradient(120% 80% at 50% 0%, var(--map-paper) 0%, var(--map-paper-deep) 70%, var(--map-paper-edge) 100%)",
        } satisfies CSSProperties
      }
    >
      {/* Paper grain — subtle noise via layered radial gradients */}
      <div
        className="absolute inset-0 opacity-50 mix-blend-multiply dark:opacity-30 dark:mix-blend-screen"
        style={{
          backgroundImage:
            "radial-gradient(rgba(120,90,55,0.12) 1px, transparent 1.4px), radial-gradient(rgba(120,90,55,0.07) 1px, transparent 1.4px)",
          backgroundSize: "5px 5px, 11px 11px",
          backgroundPosition: "0 0, 2px 3px",
        }}
      />

      {/* Vignette — gathers attention to the center */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, transparent 35%, rgba(0,0,0,0.10) 80%, rgba(0,0,0,0.22) 100%)",
        }}
      />

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        style={{ animation: "map-breathe 60s ease-in-out infinite" }}
      >
        <defs>
          {/* Landmark pictograms — single-stroke editorial glyphs */}
          <symbol id="g-eiffel" viewBox="0 0 24 24">
            <path
              d="M 8 22 L 12 4 L 16 22 M 10.2 14 L 13.8 14 M 9.2 18 L 14.8 18 M 11 9 L 13 9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </symbol>
          <symbol id="g-stones" viewBox="0 0 24 24">
            <rect x="4" y="11" width="3.2" height="11" rx="0.5" fill="currentColor" />
            <rect x="16.8" y="11" width="3.2" height="11" rx="0.5" fill="currentColor" />
            <rect x="3" y="7.5" width="18" height="3.5" rx="0.5" fill="currentColor" />
          </symbol>
          <symbol id="g-statue" viewBox="0 0 24 24">
            <circle cx="12" cy="6" r="1.8" fill="currentColor" />
            <path
              d="M 12 7.8 L 12 19 M 12 11 L 8 14 M 12 11 L 17 7.5 L 18 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M 7 19 L 17 19 L 17 22 L 7 22 Z"
              fill="currentColor"
              opacity="0.85"
            />
          </symbol>
          <symbol id="g-christ" viewBox="0 0 24 24">
            <circle cx="12" cy="6" r="1.4" fill="currentColor" />
            <path
              d="M 12 7 L 12 17 M 6.5 11 L 17.5 11"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <path
              d="M 4 22 Q 12 17 20 22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </symbol>
          <symbol id="g-pyramid" viewBox="0 0 24 24">
            <path
              d="M 12 3 L 3 22 L 21 22 Z"
              fill="currentColor"
              opacity="0.85"
            />
            <path
              d="M 12 3 L 12 22"
              stroke="var(--map-paper)"
              strokeWidth="0.8"
              opacity="0.55"
            />
            <path
              d="M 7.5 13 L 16.5 13"
              stroke="var(--map-paper)"
              strokeWidth="0.6"
              opacity="0.4"
            />
          </symbol>
          <symbol id="g-dome" viewBox="0 0 24 24">
            <path
              d="M 5 22 L 5 14 Q 12 7.5 19 14 L 19 22 Z"
              fill="currentColor"
              opacity="0.9"
            />
            <path
              d="M 3 22 L 3 12 M 21 22 L 21 12 M 12 6.5 L 12 4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <circle cx="12" cy="3.5" r="0.8" fill="currentColor" />
          </symbol>
          <symbol id="g-wall" viewBox="0 0 24 24">
            <path
              d="M 2 22 L 2 14 L 4.5 14 L 4.5 10.5 L 7 10.5 L 7 14 L 9.5 14 L 9.5 10.5 L 12 10.5 L 12 14 L 14.5 14 L 14.5 10.5 L 17 10.5 L 17 14 L 19.5 14 L 19.5 10.5 L 22 10.5 L 22 22 Z"
              fill="currentColor"
              opacity="0.9"
            />
          </symbol>
          <symbol id="g-opera" viewBox="0 0 24 24">
            <path
              d="M 2 21 Q 7 9 12 19 Z M 7 21 Q 12 7 17 19 Z M 12 21 Q 17 9 22 19 Z"
              fill="currentColor"
              opacity="0.85"
            />
            <line
              x1="1"
              y1="22"
              x2="23"
              y2="22"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </symbol>
          <symbol id="g-mountain" viewBox="0 0 24 24">
            <path
              d="M 2 22 L 12 3 L 22 22 Z"
              fill="currentColor"
              opacity="0.9"
            />
            <path
              d="M 8 13 L 12 9 L 16 13 L 14 14 L 12 12 L 10 14 Z"
              fill="var(--map-paper)"
              opacity="0.85"
            />
          </symbol>
          <symbol id="g-ruins" viewBox="0 0 24 24">
            <path
              d="M 2 22 L 5 22 L 5 16 L 9 16 L 9 11 L 13 11 L 13 16 L 17 16 L 17 22 L 22 22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </symbol>

          {/* Animal pictograms — abstracted silhouettes */}
          <symbol id="a-bear" viewBox="0 0 24 24">
            <circle cx="8" cy="9" r="2" fill="currentColor" />
            <circle cx="16" cy="9" r="2" fill="currentColor" />
            <circle cx="12" cy="14" r="5.5" fill="currentColor" />
            <circle cx="10.5" cy="13" r="0.7" fill="var(--map-paper)" />
            <circle cx="13.5" cy="13" r="0.7" fill="var(--map-paper)" />
            <circle cx="12" cy="15.5" r="0.6" fill="var(--map-paper)" />
          </symbol>
          <symbol id="a-penguin" viewBox="0 0 24 24">
            <ellipse cx="12" cy="14" rx="5" ry="7.5" fill="currentColor" />
            <ellipse cx="12" cy="14" rx="2.8" ry="5.5" fill="var(--map-paper)" />
            <circle cx="12" cy="6" r="3" fill="currentColor" />
            <path d="M 11 7 L 13 7 L 12 9 Z" fill="var(--map-gold)" />
            <circle cx="10.7" cy="5.8" r="0.5" fill="var(--map-paper)" />
            <circle cx="13.3" cy="5.8" r="0.5" fill="var(--map-paper)" />
          </symbol>
          <symbol id="a-elephant" viewBox="0 0 24 24">
            <ellipse cx="13" cy="14" rx="6" ry="5" fill="currentColor" />
            <circle cx="8" cy="12" r="3.2" fill="currentColor" />
            <path
              d="M 5.5 14 Q 3 17 4.5 20 Q 5.5 21.5 7 20.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M 7 9 Q 4 8 4 10 Q 4.5 11 6 11"
              fill="currentColor"
            />
          </symbol>
          <symbol id="a-kangaroo" viewBox="0 0 24 24">
            <path
              d="M 13 21 Q 13 16 11.5 14 Q 10 12 11.5 9.5 Q 13 7 15.5 8 L 17 5.5 L 18.5 6.5 L 16.5 9 Q 18.5 11 17 14 Q 16 17 19 19 Q 21 20 21 21 Z"
              fill="currentColor"
            />
            <circle cx="16" cy="6.5" r="0.6" fill="var(--map-paper)" />
          </symbol>
          <symbol id="a-panda" viewBox="0 0 24 24">
            <circle cx="12" cy="13" r="6" fill="currentColor" />
            <circle cx="6.5" cy="7" r="2.3" fill="currentColor" />
            <circle cx="17.5" cy="7" r="2.3" fill="currentColor" />
            <circle cx="9" cy="12" r="1.6" fill="var(--map-paper)" />
            <circle cx="15" cy="12" r="1.6" fill="var(--map-paper)" />
            <circle cx="9" cy="12.2" r="0.6" fill="currentColor" />
            <circle cx="15" cy="12.2" r="0.6" fill="currentColor" />
            <ellipse cx="12" cy="15" rx="1.2" ry="0.7" fill="var(--map-paper)" />
          </symbol>
          <symbol id="a-whale" viewBox="0 0 24 24">
            <path
              d="M 3 14 Q 8 8 14 11 L 19 9 L 18 13 L 22 12 L 21 16 L 19 16 Q 17 18 11 17 Q 6 16 3 14 Z"
              fill="currentColor"
            />
            <circle cx="8" cy="12" r="0.6" fill="var(--map-paper)" />
            <path
              d="M 14 7 Q 14 4 16 4 Q 17 5 15.5 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </symbol>
          <symbol id="a-camel" viewBox="0 0 24 24">
            <path
              d="M 3 20 Q 6 13 9 13 Q 11 13 11 10 Q 13 14 15 14 Q 18 14 19 6 L 20 9 L 20 14 Q 21 14 21 20 L 18 20 L 17.5 17 L 8 17 L 7 20 Z"
              fill="currentColor"
            />
          </symbol>
          <symbol id="a-reindeer" viewBox="0 0 24 24">
            <ellipse cx="12" cy="15" rx="5" ry="4" fill="currentColor" />
            <path
              d="M 12 11 L 12 6 M 9 4 L 12 6 L 15 4 M 7 3 L 9 4 L 9 6 M 17 3 L 15 4 L 15 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M 8 17 L 8 21 M 16 17 L 16 21" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </symbol>

          <symbol id="a-plane" viewBox="0 0 24 24">
            <path
              d="M 2 13 L 22 5 L 13 14 L 15 22 L 11 18 L 6 19 L 8 15 Z"
              fill="currentColor"
            />
          </symbol>

          {/* Compass rose */}
          <symbol id="g-compass" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              opacity="0.6"
            />
            <circle
              cx="50"
              cy="50"
              r="36"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.4"
              opacity="0.45"
              strokeDasharray="2 3"
            />
            <g stroke="currentColor" strokeWidth="0.5" opacity="0.55">
              <line x1="50" y1="6" x2="50" y2="94" />
              <line x1="6" y1="50" x2="94" y2="50" />
              <line x1="19" y1="19" x2="81" y2="81" />
              <line x1="81" y1="19" x2="19" y2="81" />
            </g>
            {/* North arrow */}
            <path d="M 50 8 L 56 50 L 50 44 L 44 50 Z" fill="currentColor" opacity="0.85" />
            <path d="M 50 92 L 56 50 L 50 56 L 44 50 Z" fill="currentColor" opacity="0.35" />
            <path d="M 8 50 L 50 44 L 44 50 L 50 56 Z" fill="currentColor" opacity="0.35" />
            <path d="M 92 50 L 50 44 L 56 50 L 50 56 Z" fill="currentColor" opacity="0.35" />
            <circle cx="50" cy="50" r="2.5" fill="currentColor" />
            <text
              x="50"
              y="16"
              textAnchor="middle"
              fontSize="6"
              fontFamily="var(--font-fraunces), serif"
              fill="currentColor"
              opacity="0.85"
              fontWeight="600"
              fontStyle="italic"
            >
              N
            </text>
          </symbol>
        </defs>

        {/* ========================================================== */}
        {/* GRATICULE — lat/lon grid                                  */}
        {/* ========================================================== */}
        <g stroke="var(--map-ink-faint)" strokeWidth="0.4" fill="none">
          {/* Meridians every 30° */}
          {Array.from({ length: 11 }, (_, i) => 83.3 * (i + 1)).map((x, i) => (
            <line key={`m-${i}`} x1={x} y1={0} x2={x} y2={H} />
          ))}
          {/* Parallels every 30° */}
          {[83.3, 166.7, 333.3, 416.7].map((y, i) => (
            <line key={`p-${i}`} x1={0} y1={y} x2={W} y2={y} />
          ))}
        </g>

        {/* Equator — gently emphasized */}
        <line
          x1={0}
          y1={H / 2}
          x2={W}
          y2={H / 2}
          stroke="var(--map-ink-soft)"
          strokeWidth="0.6"
          strokeDasharray="0 0"
          opacity="0.7"
        />
        {/* Tropics */}
        <line
          x1={0}
          y1={H / 2 - 23.5 * (H / 180)}
          x2={W}
          y2={H / 2 - 23.5 * (H / 180)}
          stroke="var(--map-ink-faint)"
          strokeWidth="0.4"
          strokeDasharray="3 5"
        />
        <line
          x1={0}
          y1={H / 2 + 23.5 * (H / 180)}
          x2={W}
          y2={H / 2 + 23.5 * (H / 180)}
          stroke="var(--map-ink-faint)"
          strokeWidth="0.4"
          strokeDasharray="3 5"
        />

        {/* Coordinate markers at major intersections — sparse, monospace */}
        <g
          fill="var(--map-ink-soft)"
          fontFamily="var(--font-geist-mono), monospace"
          fontSize="6"
          letterSpacing="0.05em"
        >
          {[
            { x: 250, y: 165, t: "60°W" },
            { x: 500, y: 165, t: "0°" },
            { x: 750, y: 165, t: "60°E" },
            { x: 250, y: 335, t: "30°S" },
            { x: 750, y: 335, t: "30°S" },
            { x: 60, y: 257, t: "—" },
          ].map((c, i) => (
            <text key={i} x={c.x} y={c.y}>
              {c.t}
            </text>
          ))}
        </g>

        {/* ========================================================== */}
        {/* CONTINENTS — hand-drawn stylized silhouettes              */}
        {/* ========================================================== */}
        <g
          fill="var(--map-ink-soft)"
          stroke="var(--map-ink)"
          strokeWidth="0.7"
          strokeLinejoin="round"
          opacity="0.95"
        >
          {/* North America */}
          <path
            d="M 55 78
               C 78 62, 130 56, 178 58
               C 232 56, 280 62, 308 75
               C 322 90, 322 118, 308 138
               C 295 152, 285 165, 280 182
               C 272 198, 255 200, 240 198
               C 226 196, 215 205, 222 220
               C 232 238, 246 252, 252 265
               C 252 272, 245 272, 240 268
               C 226 260, 215 246, 208 232
               C 198 218, 180 212, 165 200
               C 145 188, 122 175, 105 158
               C 88 142, 70 122, 60 105
               C 55 92, 53 84, 55 78 Z"
          />
          {/* Greenland */}
          <path
            d="M 355 38
               C 370 30, 388 32, 398 42
               C 408 55, 405 72, 395 82
               C 382 88, 368 84, 360 75
               C 352 65, 350 50, 355 38 Z"
          />
          {/* South America */}
          <path
            d="M 272 250
               C 290 245, 312 252, 326 268
               C 338 285, 342 308, 338 330
               C 332 358, 322 385, 312 405
               C 302 422, 290 432, 282 428
               C 274 418, 268 400, 266 380
               C 264 355, 270 328, 274 305
               C 274 285, 272 268, 272 250 Z"
          />
          {/* Europe */}
          <path
            d="M 458 88
               C 472 80, 492 80, 510 84
               C 528 88, 540 96, 543 110
               C 540 124, 528 134, 512 138
               C 495 140, 478 138, 466 132
               C 454 124, 450 110, 452 100
               C 452 94, 455 90, 458 88 Z"
          />
          {/* Britain */}
          <path
            d="M 487 102
               C 492 96, 498 95, 502 100
               C 504 108, 502 118, 496 124
               C 490 128, 485 124, 484 116
               C 484 110, 484 104, 487 102 Z"
          />
          {/* Scandinavia */}
          <path
            d="M 514 65
               C 522 60, 532 60, 540 66
               C 545 76, 542 86, 535 92
               C 528 96, 520 92, 516 84
               C 512 76, 511 70, 514 65 Z"
          />
          {/* Africa */}
          <path
            d="M 485 152
               C 510 148, 540 152, 562 168
               C 578 185, 580 215, 572 245
               C 562 275, 548 300, 530 320
               C 518 332, 506 335, 498 328
               C 490 318, 488 298, 490 278
               C 492 255, 490 232, 486 212
               C 480 192, 478 172, 482 158
               C 482 154, 483 152, 485 152 Z"
          />
          {/* Madagascar */}
          <path
            d="M 590 285
               C 595 280, 600 282, 602 290
               C 604 302, 600 314, 595 318
               C 590 316, 588 308, 588 298
               C 588 292, 588 287, 590 285 Z"
          />
          {/* Asia (mainland) */}
          <path
            d="M 542 80
               C 580 70, 630 65, 680 65
               C 730 65, 780 70, 820 80
               C 855 92, 875 110, 878 132
               C 872 158, 855 170, 830 174
               C 805 178, 780 174, 760 178
               C 750 188, 752 202, 745 215
               C 735 225, 720 228, 702 222
               C 690 215, 685 200, 690 186
               C 692 175, 685 168, 670 165
               C 645 158, 620 152, 600 146
               C 580 138, 558 128, 548 112
               C 540 100, 538 88, 542 80 Z"
          />
          {/* India peninsula */}
          <path
            d="M 668 168
               C 680 175, 688 188, 690 205
               C 688 220, 680 228, 672 226
               C 664 220, 660 205, 662 188
               C 663 178, 666 170, 668 168 Z"
          />
          {/* Arabian peninsula */}
          <path
            d="M 590 168
               C 605 168, 618 175, 620 188
               C 618 200, 608 208, 598 208
               C 588 205, 582 195, 584 182
               C 585 174, 587 170, 590 168 Z"
          />
          {/* SE Asia archipelago — Sumatra/Java/Borneo */}
          <path
            d="M 786 215
               C 800 213, 814 218, 820 228
               C 820 238, 810 244, 798 242
               C 788 238, 780 230, 780 222
               C 780 218, 783 215, 786 215 Z"
          />
          <path
            d="M 822 232
               C 832 230, 842 233, 845 240
               C 844 246, 836 250, 828 248
               C 822 244, 818 238, 822 232 Z"
          />
          {/* Japan */}
          <path
            d="M 870 130
               C 878 128, 884 134, 886 142
               C 886 154, 880 162, 874 162
               C 870 158, 868 148, 868 138
               C 868 134, 868 131, 870 130 Z"
          />
          {/* Australia */}
          <path
            d="M 822 318
               C 850 308, 882 312, 905 322
               C 920 332, 920 350, 905 360
               C 882 368, 855 370, 832 365
               C 818 360, 812 348, 815 335
               C 816 325, 819 320, 822 318 Z"
          />
          {/* New Zealand */}
          <path
            d="M 933 370
               C 940 370, 944 376, 942 384
               C 938 388, 932 386, 930 380
               C 930 374, 931 371, 933 370 Z"
          />
          <path
            d="M 945 388
               C 950 388, 952 392, 950 396
               C 946 398, 943 396, 943 392
               C 943 390, 944 388, 945 388 Z"
          />
          {/* Antarctica */}
          <path
            d="M 0 446
               C 80 432, 160 436, 240 432
               C 320 430, 400 430, 480 432
               C 560 434, 640 432, 720 432
               C 800 432, 880 430, 1000 446
               L 1000 500
               L 0 500 Z"
          />
        </g>

        {/* Continent inland line work — faint accents for depth */}
        <g
          fill="none"
          stroke="var(--map-ink-faint)"
          strokeWidth="0.4"
          strokeLinecap="round"
          opacity="0.8"
        >
          {/* Mississippi-ish */}
          <path d="M 245 145 Q 248 175 252 200" />
          {/* Amazon-ish */}
          <path d="M 285 280 Q 305 285 318 282" />
          {/* Nile-ish */}
          <path d="M 545 175 Q 542 200 533 235 Q 528 260 525 290" />
          {/* Volga-ish */}
          <path d="M 595 105 Q 595 130 590 150" />
          {/* Yangtze-ish */}
          <path d="M 770 145 Q 800 155 830 150" />
          {/* Murray-ish */}
          <path d="M 845 345 Q 860 350 880 345" />
        </g>

        {/* ========================================================== */}
        {/* FLIGHT ARCS — dashed great-circle paths                   */}
        {/* ========================================================== */}
        <g
          fill="none"
          stroke="var(--map-route)"
          strokeWidth="0.9"
          strokeLinecap="round"
          opacity="0.9"
        >
          {flights.map((f) => (
            <path
              key={`arc-${f.i}`}
              id={`flight-${f.i}`}
              d={f.d}
              strokeDasharray="4 6"
              style={{
                animation: `dash-flow ${10 + f.i * 1.7}s linear infinite`,
              }}
            />
          ))}
        </g>

        {/* ========================================================== */}
        {/* TWINKLES — distant stars / sea sparkles                   */}
        {/* ========================================================== */}
        <g fill="var(--map-gold)">
          {TWINKLES.map((t, i) => (
            <circle
              key={`tw-${i}`}
              cx={t.x}
              cy={t.y}
              r={t.r}
              opacity="0.6"
              style={{
                animation: `twinkle ${t.t}s ease-in-out ${t.d}s infinite`,
              }}
            />
          ))}
        </g>

        {/* ========================================================== */}
        {/* ANIMAL PICTOGRAMS                                         */}
        {/* ========================================================== */}
        <g style={{ color: "var(--map-ink)" }} opacity="0.7">
          {ANIMALS.map((a, i) => {
            const { x, y } = project(a.lat, a.lon);
            const size = a.size ?? 18;
            return (
              <g
                key={a.name}
                transform={`translate(${x - size / 2}, ${y - size / 2})`}
                style={{
                  animation: `animal-drift ${7 + (i % 3)}s ease-in-out ${
                    i * 0.6
                  }s infinite`,
                  transformOrigin: "center",
                }}
              >
                <use href={`#${a.glyph}`} width={size} height={size} />
              </g>
            );
          })}
        </g>

        {/* ========================================================== */}
        {/* LANDMARK PINS — halo + glyph + bob                       */}
        {/* ========================================================== */}
        <g>
          {LANDMARKS.map((lm, i) => {
            const { x, y } = project(lm.lat, lm.lon);
            const size = lm.size ?? 14;
            return (
              <g key={lm.name} transform={`translate(${x}, ${y})`}>
                {/* Outer halo */}
                <circle
                  cx="0"
                  cy="0"
                  r="3"
                  fill="var(--map-accent-glow)"
                  style={{
                    animation: `landmark-halo 4.5s ease-in-out ${
                      (i * 0.41) % 4.5
                    }s infinite`,
                    transformOrigin: "center",
                  }}
                />
                {/* Glyph itself */}
                <g
                  transform={`translate(${-size / 2}, ${-size - 2})`}
                  style={{ color: "var(--map-accent)" }}
                >
                  <g
                    style={{
                      animation: `landmark-bob ${
                        5 + (i % 3) * 0.7
                      }s ease-in-out ${(i * 0.3) % 5}s infinite`,
                      transformOrigin: `${size / 2}px ${size}px`,
                    }}
                  >
                    <use href={`#${lm.glyph}`} width={size} height={size} />
                  </g>
                </g>
                {/* Pin dot */}
                <circle
                  cx="0"
                  cy="0"
                  r="1.5"
                  fill="var(--map-accent)"
                  style={{
                    animation: `landmark-pulse 4s ease-in-out ${
                      (i * 0.41) % 4
                    }s infinite`,
                    transformOrigin: "center",
                  }}
                />
              </g>
            );
          })}
        </g>

        {/* ========================================================== */}
        {/* PAPER PLANES — SMIL motion along flight arcs              */}
        {/* ========================================================== */}
        <g style={{ color: "var(--map-plane)" }}>
          {flights
            .filter((f) => f.withPlane)
            .map((f) => (
              <g key={`plane-${f.i}`}>
                <use
                  href="#a-plane"
                  width="10"
                  height="10"
                  x="-5"
                  y="-5"
                  opacity="0.85"
                >
                  <animateMotion
                    dur={`${f.duration}s`}
                    repeatCount="indefinite"
                    rotate="auto"
                    begin={`${f.offset}s`}
                    keyPoints="0;1"
                    keyTimes="0;1"
                    path={f.d}
                  />
                  <animate
                    attributeName="opacity"
                    values="0;0.85;0.85;0"
                    keyTimes="0;0.1;0.9;1"
                    dur={`${f.duration}s`}
                    repeatCount="indefinite"
                    begin={`${f.offset}s`}
                  />
                </use>
              </g>
            ))}
        </g>

        {/* ========================================================== */}
        {/* COMPASS ROSE — bottom-left, slow rotation                  */}
        {/* ========================================================== */}
        <g
          transform="translate(70, 410)"
          style={{ color: "var(--map-ink)" }}
          opacity="0.55"
        >
          <g
            style={{
              animation: "compass-rotate 90s linear infinite",
              transformOrigin: "45px 45px",
            }}
          >
            <use href="#g-compass" width="90" height="90" />
          </g>
        </g>

        {/* Editorial nameplate, lower-right */}
        <g
          transform={`translate(${W - 230}, ${H - 24})`}
          style={{ color: "var(--map-ink)" }}
          opacity="0.5"
        >
          <text
            fontSize="10"
            fontFamily="var(--font-fraunces), serif"
            fontStyle="italic"
            fontWeight="400"
            fill="currentColor"
            letterSpacing="0.05em"
          >
            Tripify · planispheric atlas
          </text>
          <text
            y="12"
            fontSize="6"
            fontFamily="var(--font-geist-mono), monospace"
            letterSpacing="0.25em"
            fill="currentColor"
            opacity="0.7"
          >
            EQUIRECTANGULAR · 1:∞
          </text>
        </g>
      </svg>
    </div>
  );
}
