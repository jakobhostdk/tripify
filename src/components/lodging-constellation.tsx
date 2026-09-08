"use client";

import { useEffect, useMemo, useState } from "react";
import {
  latLonToImagePx,
  staticMapDimensions,
  staticMapZoom,
} from "@/lib/static-map-projection";

/** Plain data passed in from the Overview RSC — must be JSON-serialisable. */
export type ConstellationLodging = {
  id: string;
  title: string;
  proposerName: string;
  lat: number;
  lon: number;
  imageUrl?: string;
  checkin?: string;
  checkout?: string;
  adults?: number;
  children?: number;
  currency?: string;
  nights?: number;
  fit?: "fits" | "partial" | "outside" | "no-target";
};

type Props = {
  destinationLat: number;
  destinationLon: number;
  regionRadiusDeg: number;
  accentHex: string;
  lodgings: ConstellationLodging[];
};

const FRAME_W = 296;
const FRAME_MARGIN = 24;

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

function useViewport() {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

export default function LodgingConstellation({
  destinationLat,
  destinationLon,
  regionRadiusDeg,
  accentHex,
  lodgings,
}: Props) {
  const viewport = useViewport();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const accent = isValidHex(accentHex) ? accentHex : "#8a2828";

  /**
   * Project each lodging's lat/lon into viewport-pixel space by composing two
   * transforms:
   *   1. lat/lon → image-pixel coordinates (Web Mercator, same as the watercolor
   *      map) using `latLonToImagePx`.
   *   2. image-pixel → viewport-pixel by replaying CSS `background-size: cover` —
   *      uniform scale `max(vw/imgW, vh/imgH)`, centred letterboxing.
   * The result is in the same coordinate space as everything else in the SVG
   * overlay, so dots, curve, and the screen-space frame all align.
   */
  const positioned = useMemo(() => {
    if (!viewport) return [];
    const { width: imgW, height: imgH } = staticMapDimensions();
    const zoom = staticMapZoom(regionRadiusDeg);
    const scale = Math.max(viewport.w / imgW, viewport.h / imgH);
    const scaledW = imgW * scale;
    const scaledH = imgH * scale;
    const offsetX = (viewport.w - scaledW) / 2;
    const offsetY = (viewport.h - scaledH) / 2;

    return lodgings
      .map((l) => {
        const p = latLonToImagePx(
          l.lat,
          l.lon,
          destinationLat,
          destinationLon,
          zoom,
          imgW,
          imgH,
        );
        return {
          ...l,
          screenX: offsetX + p.x * scale,
          screenY: offsetY + p.y * scale,
          insideBounds: p.insideBounds,
        };
      })
      .filter((d) => d.insideBounds);
  }, [viewport, lodgings, destinationLat, destinationLon, regionRadiusDeg]);

  if (!viewport || positioned.length === 0) return null;

  const hovered = positioned.find((d) => d.id === hoveredId) ?? null;

  // Right-edge frame anchor — connect the curve to the middle of its left edge.
  const frameLeftX = viewport.w - FRAME_W - FRAME_MARGIN;
  const frameCenterY = viewport.h / 2;

  let curvePath: string | null = null;
  if (hovered) {
    const sx = hovered.screenX;
    const sy = hovered.screenY;
    const ex = frameLeftX;
    const ey = frameCenterY;
    // Quadratic bezier arcing upward — control point above whichever endpoint is higher.
    const cx = (sx + ex) / 2;
    const cy = Math.min(sy, ey) - 110;
    curvePath = `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(
      1,
    )} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  }

  return (
    <>
      <svg
        aria-hidden
        className="pointer-events-none fixed inset-0 z-30"
        width={viewport.w}
        height={viewport.h}
        viewBox={`0 0 ${viewport.w} ${viewport.h}`}
      >
        {/* Curve + travelling ball — only rendered while hovering */}
        {curvePath && (
          <g>
            <path
              key={curvePath}
              d={curvePath}
              fill="none"
              stroke={accent}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="6 6"
              opacity="0.85"
              style={{
                animation: "constellation-draw 0.45s ease-out forwards",
              }}
            />
            <circle r="5" fill={accent} opacity="0.95">
              <animateMotion
                key={`m-${curvePath}`}
                dur="1.6s"
                repeatCount="indefinite"
                path={curvePath}
                rotate="auto"
              />
              <animate
                attributeName="r"
                values="3;5;3"
                dur="1.6s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        )}

        {/* Dots — pointer-events:auto only on the circle, so the rest of the
            overlay stays transparent to clicks/hovers on content below. */}
        {positioned.map((d) => {
          const isHovered = d.id === hoveredId;
          return (
            <g key={d.id}>
              {/* Always-on slow halo */}
              <circle
                cx={d.screenX}
                cy={d.screenY}
                r={isHovered ? 18 : 14}
                fill="none"
                stroke={accent}
                strokeWidth="1"
                opacity={isHovered ? 0.65 : 0.35}
                style={{
                  animation: "constellation-halo 3.4s ease-in-out infinite",
                  transformOrigin: `${d.screenX}px ${d.screenY}px`,
                  transition: "r 0.18s ease",
                }}
              />
              {/* Soft glow */}
              <circle
                cx={d.screenX}
                cy={d.screenY}
                r={isHovered ? 14 : 10}
                fill={hexWithAlpha(accent, isHovered ? 0.28 : 0.18)}
                style={{ transition: "r 0.18s ease, fill 0.18s ease" }}
              />
              {/* Interactive core */}
              <circle
                cx={d.screenX}
                cy={d.screenY}
                r={isHovered ? 6 : 4.5}
                fill={accent}
                className="pointer-events-auto cursor-pointer"
                style={{ transition: "r 0.18s ease" }}
                onMouseEnter={() => setHoveredId(d.id)}
                onFocus={() => setHoveredId(d.id)}
                onMouseLeave={() => setHoveredId(null)}
                onBlur={() => setHoveredId(null)}
                tabIndex={0}
              />
              <title>{d.title}</title>
            </g>
          );
        })}
      </svg>

      {/* Info frame — appears beside the curve's endpoint */}
      {hovered && (
        <div
          className="pointer-events-none fixed z-40"
          style={{
            top: `${frameCenterY}px`,
            left: `${frameLeftX}px`,
            width: `${FRAME_W}px`,
            transform: "translate(0, -50%)",
            animation: "constellation-frame-in 0.35s ease-out forwards",
          }}
        >
          <div className="glass-card overflow-hidden p-3.5">
            {hovered.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hovered.imageUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="mb-3 block aspect-[16/10] w-full rounded-md object-cover"
              />
            )}
            <p
              className="font-mono text-[10px] uppercase tracking-[0.22em]"
              style={{ color: accent }}
            >
              proposed logi
            </p>
            <h4 className="font-display mt-1 text-lg font-light italic leading-tight text-[color:var(--map-ink)]">
              {hovered.title}
            </h4>
            <p className="mt-1 text-xs text-[color:var(--map-ink)]/55">
              by{" "}
              <span className="font-display italic text-[color:var(--map-ink)]/80">
                {hovered.proposerName}
              </span>
            </p>

            {hovered.checkin && hovered.checkout && (
              <p className="mt-3 font-mono text-xs tabular-nums text-[color:var(--map-ink)]/80">
                {hovered.checkin} → {hovered.checkout}
                {hovered.nights ? (
                  <span className="ml-2 text-[color:var(--map-ink)]/55">
                    · {hovered.nights}n
                  </span>
                ) : null}
              </p>
            )}
            {(hovered.adults || hovered.children) && (
              <p className="mt-1 text-xs text-[color:var(--map-ink)]/65">
                {hovered.adults
                  ? `${hovered.adults} ${hovered.adults === 1 ? "adult" : "adults"}`
                  : ""}
                {hovered.children
                  ? `${hovered.adults ? " · " : ""}${hovered.children} ${
                      hovered.children === 1 ? "child" : "children"
                    }`
                  : ""}
              </p>
            )}
            {hovered.fit && hovered.fit !== "no-target" && (
              <p
                className="mt-3 text-[11px] font-medium"
                style={{
                  color: hovered.fit === "fits" ? "var(--map-gold)" : accent,
                }}
              >
                {hovered.fit === "fits" && "✓ fits the target window"}
                {hovered.fit === "partial" &&
                  "≈ overlaps the target but spills past one edge"}
                {hovered.fit === "outside" && "✗ outside the target window"}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
