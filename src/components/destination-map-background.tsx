import type { CSSProperties } from "react";
import type { DestinationData, LandmarkKind } from "@/lib/destination";
import {
  CONTINENT_PATHS,
  UNITS_PER_DEG,
  project,
  regionViewBox,
} from "@/lib/world-geometry";
import {
  staticMapDimensions,
  staticMapZoom,
  latLonToImagePx,
} from "@/lib/static-map";

const MIN_RADIUS_DEG = 3;
const MAX_RADIUS_DEG = 25;

function clampRadius(r: number): number {
  return Math.max(MIN_RADIUS_DEG, Math.min(MAX_RADIUS_DEG, r));
}

function isValidHex(s: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(s);
}

function hexWithAlpha(hex: string, alpha: number): string {
  if (!isValidHex(hex)) return `rgba(140, 45, 31, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const LANDMARK_GLYPH: Record<LandmarkKind, string> = {
  monument: "dest-monument",
  nature: "dest-nature",
  square: "dest-square",
  museum: "dest-museum",
  religious: "dest-religious",
  cityscape: "dest-cityscape",
  water: "dest-water",
};

const GLYPH_DEFS = (
  <defs>
    <symbol id="dest-monument" viewBox="0 0 24 24">
      <path
        d="M 9 22 L 12 4 L 15 22 M 10 14 L 14 14 M 9 18 L 15 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </symbol>
    <symbol id="dest-nature" viewBox="0 0 24 24">
      <path d="M 3 22 L 12 5 L 21 22 Z" fill="currentColor" opacity="0.9" />
      <path
        d="M 8 15 L 12 10 L 16 15"
        fill="none"
        stroke="var(--map-paper)"
        strokeWidth="1"
      />
    </symbol>
    <symbol id="dest-square" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="6" fill="currentColor" />
      <circle
        cx="12"
        cy="12"
        r="9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.5"
      />
    </symbol>
    <symbol id="dest-museum" viewBox="0 0 24 24">
      <path
        d="M 3 9 L 12 3 L 21 9 L 21 12 L 3 12 Z"
        fill="currentColor"
        opacity="0.92"
      />
      <path
        d="M 5 12 L 5 19 M 10 12 L 10 19 M 14 12 L 14 19 M 19 12 L 19 19"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M 2 22 L 22 22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </symbol>
    <symbol id="dest-religious" viewBox="0 0 24 24">
      <path
        d="M 5 22 L 5 14 Q 12 7 19 14 L 19 22 Z"
        fill="currentColor"
        opacity="0.92"
      />
      <path
        d="M 12 7 L 12 3 M 10 5 L 14 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </symbol>
    <symbol id="dest-cityscape" viewBox="0 0 24 24">
      <path
        d="M 2 22 L 2 14 L 5 14 L 5 10 L 9 10 L 9 7 L 12 7 L 12 4 L 15 4 L 15 11 L 18 11 L 18 14 L 22 14 L 22 22 Z"
        fill="currentColor"
        opacity="0.95"
      />
    </symbol>
    <symbol id="dest-water" viewBox="0 0 24 24">
      <path
        d="M 2 9 Q 6 5 10 9 T 18 9 T 22 9 M 2 14 Q 6 10 10 14 T 18 14 T 22 14 M 2 19 Q 6 15 10 19 T 18 19 T 22 19"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </symbol>
  </defs>
);

export default function DestinationMapBackground({
  destination,
  mapImageUrl = null,
}: {
  destination: DestinationData;
  /** When set, the Stadia Stamen Watercolor PNG is layered as the basemap. */
  mapImageUrl?: string | null;
}) {
  const accent = isValidHex(destination.accent_hex)
    ? destination.accent_hex
    : "#8a2828";
  const accentSoft = hexWithAlpha(accent, 0.55);
  const accentWhisper = hexWithAlpha(accent, 0.08);

  const hasRealMap = !!mapImageUrl;

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
      {hasRealMap ? (
        <RealMapLayer
          destination={destination}
          mapImageUrl={mapImageUrl!}
          accent={accent}
          accentSoft={accentSoft}
        />
      ) : (
        <SvgContinentLayer
          destination={destination}
          accent={accent}
          accentSoft={accentSoft}
        />
      )}

      {/* Mood tint */}
      <div
        className="absolute inset-0 mix-blend-multiply dark:mix-blend-screen"
        style={{
          background: `radial-gradient(60% 50% at 50% 45%, ${accentWhisper} 0%, transparent 70%)`,
        }}
      />

      {/* Paper grain */}
      <div
        className="absolute inset-0 opacity-30 mix-blend-multiply dark:opacity-25 dark:mix-blend-screen"
        style={{
          backgroundImage:
            "radial-gradient(rgba(120,90,55,0.10) 1px, transparent 1.4px), radial-gradient(rgba(120,90,55,0.06) 1px, transparent 1.4px)",
          backgroundSize: "5px 5px, 11px 11px",
          backgroundPosition: "0 0, 2px 3px",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, transparent 35%, rgba(0,0,0,0.10) 80%, rgba(0,0,0,0.28) 100%)",
        }}
      />

      {/* Editorial nameplate, bottom right */}
      <div className="absolute bottom-6 right-6 max-w-xs text-right">
        <p className="eyebrow">{destination.country}</p>
        <p
          className="font-display mt-1 text-base italic"
          style={{ color: "var(--map-ink)", opacity: 0.75 }}
        >
          {destination.mood}
        </p>
        <p
          className="mt-1 font-mono text-[10px] tracking-[0.2em]"
          style={{ color: "var(--map-ink)", opacity: 0.5 }}
        >
          {fmtCoord(destination.lat, "lat")} ·{" "}
          {fmtCoord(destination.lon, "lon")}
        </p>
      </div>
    </div>
  );
}

/* ============================================================== */
/*  REAL-MAP MODE — Stamen Watercolor PNG with Mercator overlay   */
/* ============================================================== */

function RealMapLayer({
  destination,
  mapImageUrl,
  accent,
  accentSoft,
}: {
  destination: DestinationData;
  mapImageUrl: string;
  accent: string;
  accentSoft: string;
}) {
  const { width: imgW, height: imgH } = staticMapDimensions();
  const zoom = staticMapZoom(destination.region_radius_deg);

  // Centre of the image in pixel coords
  const cx = imgW / 2;
  const cy = imgH / 2;

  // Approximate distance rings in pixels — using image width as ground truth
  const ringPx = [imgW * 0.08, imgW * 0.14, imgW * 0.22];

  return (
    <>
      {/* The raster watercolor map, sized to cover the viewport */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${mapImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.62,
        }}
      />

      {/* Overlay landmarks + crosshair in image pixel space */}
      <svg
        viewBox={`0 0 ${imgW} ${imgH}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        {GLYPH_DEFS}

        {/* Concentric distance rings around the destination */}
        <g
          fill="none"
          stroke={accentSoft}
          strokeWidth={3}
          strokeDasharray="10 14"
          opacity="0.7"
        >
          {ringPx.map((r, i) => (
            <circle key={i} cx={cx} cy={cy} r={r} />
          ))}
        </g>

        {/* Destination crosshair */}
        <g stroke={accent} strokeLinecap="round" fill={accent}>
          <line
            x1={cx - 35}
            y1={cy}
            x2={cx + 35}
            y2={cy}
            strokeWidth="3"
          />
          <line
            x1={cx}
            y1={cy - 35}
            x2={cx}
            y2={cy + 35}
            strokeWidth="3"
          />
          <circle
            cx={cx}
            cy={cy}
            r="8"
            style={{
              animation: "landmark-pulse 4s ease-in-out infinite",
              transformOrigin: `${cx}px ${cy}px`,
            }}
          />
        </g>

        {/* AI landmarks positioned via Web Mercator over the image */}
        <g style={{ color: accent }}>
          {destination.landmarks.map((lm, i) => {
            const pos = latLonToImagePx(
              lm.lat,
              lm.lon,
              destination.lat,
              destination.lon,
              zoom,
              imgW,
              imgH,
            );
            // Skip landmarks the AI placed wildly outside the framed region —
            // adds a little margin so near-edge ones still render.
            if (
              pos.x < -imgW * 0.05 ||
              pos.x > imgW * 1.05 ||
              pos.y < -imgH * 0.05 ||
              pos.y > imgH * 1.05
            ) {
              return null;
            }

            const glyphSize = 36;
            const dotR = 6;
            const haloR = 18;
            const glyphId =
              LANDMARK_GLYPH[lm.kind] ?? LANDMARK_GLYPH.square;

            return (
              <g key={`${lm.name}-${i}`}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={haloR}
                  fill={hexWithAlpha(accent, 0.22)}
                  style={{
                    animation: `landmark-halo 5s ease-in-out ${
                      (i * 0.5) % 5
                    }s infinite`,
                    transformOrigin: `${pos.x}px ${pos.y}px`,
                  }}
                />
                <g
                  transform={`translate(${pos.x - glyphSize / 2}, ${
                    pos.y - glyphSize - dotR * 1.3
                  })`}
                  style={{
                    animation: `landmark-bob ${
                      5 + (i % 3) * 0.7
                    }s ease-in-out ${(i * 0.3) % 5}s infinite`,
                    transformOrigin: `${glyphSize / 2}px ${glyphSize}px`,
                  }}
                >
                  <use
                    href={`#${glyphId}`}
                    width={glyphSize}
                    height={glyphSize}
                  />
                </g>
                <circle cx={pos.x} cy={pos.y} r={dotR} />
                {/* Name + thin connector line */}
                <line
                  x1={pos.x}
                  y1={pos.y - dotR}
                  x2={pos.x + 14}
                  y2={pos.y - dotR - 14}
                  stroke={accent}
                  strokeWidth="1.5"
                  opacity="0.7"
                />
                <text
                  x={pos.x + 16}
                  y={pos.y - dotR - 16}
                  fontFamily="var(--font-fraunces), serif"
                  fontStyle="italic"
                  fontSize="22"
                  fill="var(--map-ink)"
                  opacity="0.92"
                  style={{
                    paintOrder: "stroke",
                    stroke: "var(--map-paper)",
                    strokeWidth: "4",
                    strokeOpacity: 0.7,
                    strokeLinejoin: "round",
                  }}
                >
                  {lm.name}
                </text>
              </g>
            );
          })}
        </g>

        {/* Destination label */}
        <g
          transform={`translate(${cx}, ${cy + 60})`}
          textAnchor="middle"
          style={{
            paintOrder: "stroke",
            stroke: "var(--map-paper)",
            strokeWidth: "5",
            strokeOpacity: 0.85,
            strokeLinejoin: "round",
          }}
        >
          <text
            fontFamily="var(--font-fraunces), serif"
            fontWeight={400}
            fontStyle="italic"
            fontSize="46"
            fill="var(--map-ink)"
            opacity="0.88"
          >
            {destination.destination_name}
          </text>
        </g>
      </svg>
    </>
  );
}

/* ============================================================== */
/*  SVG-MODE — fallback when Stadia map isn't available           */
/* ============================================================== */

function SvgContinentLayer({
  destination,
  accent,
  accentSoft,
}: {
  destination: DestinationData;
  accent: string;
  accentSoft: string;
}) {
  const radius = clampRadius(destination.region_radius_deg);
  const viewBox = regionViewBox(destination.lat, destination.lon, radius);
  const center = project(destination.lat, destination.lon);
  const ringR = [radius * 0.25, radius * 0.5, radius * 0.85].map(
    (r) => r * UNITS_PER_DEG,
  );

  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full opacity-90"
    >
      {GLYPH_DEFS}

      {/* Adaptive graticule */}
      <g stroke="var(--map-ink-faint)" strokeWidth="0.15" fill="none">
        {Array.from({ length: 11 }).map((_, i) => {
          const stride = (radius * UNITS_PER_DEG) / 5;
          const offset = (i - 5) * stride;
          return (
            <g key={i}>
              <line
                x1={center.x + offset}
                y1={center.y - radius * UNITS_PER_DEG}
                x2={center.x + offset}
                y2={center.y + radius * UNITS_PER_DEG}
              />
              <line
                x1={center.x - radius * UNITS_PER_DEG}
                y1={center.y + offset}
                x2={center.x + radius * UNITS_PER_DEG}
                y2={center.y + offset}
              />
            </g>
          );
        })}
      </g>

      {/* Continents */}
      <g
        fill="var(--map-ink-soft)"
        stroke="var(--map-ink)"
        strokeWidth={0.12 * radius}
        strokeLinejoin="round"
        opacity="0.85"
      >
        {CONTINENT_PATHS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* Halo */}
      <circle
        cx={center.x}
        cy={center.y}
        r={radius * UNITS_PER_DEG * 0.92}
        fill={hexWithAlpha(accent, 0.07)}
      />

      {/* Rings */}
      <g
        fill="none"
        stroke={accentSoft}
        strokeWidth={0.06 * radius}
        strokeDasharray={`${0.15 * radius} ${0.25 * radius}`}
        opacity="0.85"
      >
        {ringR.map((r, i) => (
          <circle key={i} cx={center.x} cy={center.y} r={r} />
        ))}
      </g>

      {/* Crosshair */}
      <g stroke={accent} strokeLinecap="round" fill={accent}>
        <line
          x1={center.x - radius * UNITS_PER_DEG * 0.22}
          y1={center.y}
          x2={center.x + radius * UNITS_PER_DEG * 0.22}
          y2={center.y}
          strokeWidth={0.06 * radius}
        />
        <line
          x1={center.x}
          y1={center.y - radius * UNITS_PER_DEG * 0.22}
          x2={center.x}
          y2={center.y + radius * UNITS_PER_DEG * 0.22}
          strokeWidth={0.06 * radius}
        />
        <circle
          cx={center.x}
          cy={center.y}
          r={0.08 * radius}
          style={{
            animation: "landmark-pulse 4s ease-in-out infinite",
            transformOrigin: `${center.x}px ${center.y}px`,
          }}
        />
      </g>

      {/* Landmarks (degree-projected) */}
      <g style={{ color: accent }}>
        {destination.landmarks.map((lm, i) => {
          const { x, y } = project(lm.lat, lm.lon);
          const glyphSize = 0.5 * radius;
          const dotR = 0.07 * radius;
          const haloR = 0.18 * radius;
          const glyphId =
            LANDMARK_GLYPH[lm.kind] ?? LANDMARK_GLYPH.square;
          return (
            <g key={`${lm.name}-${i}`}>
              <circle
                cx={x}
                cy={y}
                r={haloR}
                fill={hexWithAlpha(accent, 0.18)}
                style={{
                  animation: `landmark-halo 5s ease-in-out ${
                    (i * 0.5) % 5
                  }s infinite`,
                  transformOrigin: `${x}px ${y}px`,
                }}
              />
              <g
                transform={`translate(${x - glyphSize / 2}, ${
                  y - glyphSize - dotR * 1.3
                })`}
                style={{
                  animation: `landmark-bob ${
                    5 + (i % 3) * 0.7
                  }s ease-in-out ${(i * 0.3) % 5}s infinite`,
                  transformOrigin: `${glyphSize / 2}px ${glyphSize}px`,
                }}
              >
                <use href={`#${glyphId}`} width={glyphSize} height={glyphSize} />
              </g>
              <circle cx={x} cy={y} r={dotR} />
              <text
                x={x + dotR * 2}
                y={y + dotR * 1.5}
                fontFamily="var(--font-fraunces), serif"
                fontStyle="italic"
                fontSize={0.32 * radius}
                fill="var(--map-ink)"
                opacity="0.75"
              >
                {lm.name}
              </text>
            </g>
          );
        })}
      </g>

      {/* Destination label */}
      <g
        transform={`translate(${center.x}, ${
          center.y + radius * UNITS_PER_DEG * 0.96
        })`}
        textAnchor="middle"
      >
        <text
          fontFamily="var(--font-fraunces), serif"
          fontWeight={400}
          fontStyle="italic"
          fontSize={radius * 0.9}
          fill="var(--map-ink)"
          opacity="0.6"
        >
          {destination.destination_name}
        </text>
      </g>
    </svg>
  );
}

function fmtCoord(value: number, kind: "lat" | "lon"): string {
  const abs = Math.abs(value);
  const dir =
    kind === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${abs.toFixed(2)}° ${dir}`;
}
