"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Item = {
  href: string;
  label: string;
  icon: ReactNode;
  /** Match exact path; otherwise startsWith */
  exact?: boolean;
};

export default function TripSidebar({ tripId }: { tripId: string }) {
  const pathname = usePathname();

  const items: Item[] = [
    {
      href: `/trips/${tripId}`,
      label: "Overview",
      exact: true,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          {/* Television silhouette — communicates the shared-screen role */}
          <rect
            x="3"
            y="5"
            width="18"
            height="12"
            rx="1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M 8 21 H 16 M 12 17 V 21"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="12" cy="11" r="2.5" fill="currentColor" opacity="0.8" />
        </svg>
      ),
    },
    {
      href: `/trips/${tripId}/plan`,
      label: "Plan",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          {/* Speech bubble with a check — propose + decide */}
          <path
            d="M 4 5 H 20 V 16 H 13 L 9 20 V 16 H 4 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M 8 11 L 11 13.5 L 16 8.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      href: `/trips/${tripId}/prompt`,
      label: "Trip prompt",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path
            d="M 5 4 H 16 L 20 8 V 20 H 5 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M 16 4 V 8 H 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M 8 12 H 17 M 8 16 H 14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      href: `/trips/${tripId}/participants`,
      label: "Participants",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <circle
            cx="9"
            cy="9"
            r="3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle
            cx="17"
            cy="11"
            r="2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M 3 20 Q 9 14 15 20 M 13.5 19 Q 17 15 21 19"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      href: `/trips/${tripId}/economy`,
      label: "Economy",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <circle
            cx="12"
            cy="12"
            r="8.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M 9 9 Q 9 7 12 7 Q 15 7 15 9 Q 15 11 12 11.5 Q 9 12 9 14 Q 9 16 12 16 Q 15 16 15 14 M 12 5.5 V 17.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <nav aria-label="Trip sections" className="w-full sm:w-44">
      <ul className="flex gap-1 overflow-x-auto sm:flex-col">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-[color:var(--map-accent)]/12 text-[color:var(--map-accent)]"
                    : "text-[color:var(--map-ink)]/75 hover:bg-[color:var(--map-ink)]/8 hover:text-[color:var(--map-ink)]",
                ].join(" ")}
              >
                <span
                  className={[
                    "shrink-0",
                    active
                      ? "text-[color:var(--map-accent)]"
                      : "text-[color:var(--map-ink)]/60 group-hover:text-[color:var(--map-ink)]",
                  ].join(" ")}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
