# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Tripify — a Next.js app for **cooperatively planning a trip** among one or more participants. The core interaction model is split across two device roles:

- **TV / status view** — a large shared screen (TV, monitor, projector) that displays the live "state of the plan" for the currently active trip. It is read-mostly and updates in real time as participants make choices.
- **Participant devices** — each person joins from their own phone, tablet, or laptop, picks a trip ("project") from a list, and contributes to planning it. Multiple participants edit the same trip concurrently.

The TV view and the participant views are looking at the same trip state from different angles: the TV aggregates and presents; the personal devices propose, vote, and commit.

This shapes the architecture in a few non-obvious ways:
- **Multi-trip, not single-tenant.** A "trip" is a first-class entity that participants pick from a list; the app is not scoped to one trip at a time.
- **Real-time sync is load-bearing**, not an enhancement. The TV view must reflect participant actions without manual refresh, so the data layer needs a push/subscribe story (websockets, server-sent events, or a realtime DB) rather than purely request/response.
- **Two distinct UI surfaces** for the same data — the TV layout is presentation-optimized (large type, glanceable), the participant layout is interaction-optimized (forms, lists, voting).

When adding features, ask: *does this need to show up on the TV, on the participant view, or both?* — and design the data flow accordingly.

## Stack

- **Next.js 16** (App Router, Turbopack dev) — ⚠️ **Next.js 16 has breaking changes** from older versions; APIs, conventions, and file layout differ from what may be in your training data. Consult `node_modules/next/dist/docs/` before writing Next-specific code.
- **React 19**
- **TypeScript 5**
- **Tailwind CSS v4** (via `@tailwindcss/postcss`)
- **ESLint 9** with `eslint-config-next`
- Code lives under `src/app/` (App Router), import alias `@/*` → `src/*`
- Package manager: **npm**

## Commands

```bash
npm install          # install deps (first time / after package.json changes)
npm run dev          # start Turbopack dev server on http://localhost:3000
npm run build        # production build
npm run start        # serve production build
npm run lint         # ESLint
```

No test runner is wired up yet — add one (and document it here) when tests are introduced.

## Hosting convention

Inspired by `~/development/boligtracker/`: the family pattern in this development folder is **Hetzner Cloud VPS + Caddy (automatic Let's Encrypt TLS) + Cloudflare DNS** under the `jakobholst.dk` apex. Tripify is expected to follow that recipe when deployment lands. See the parent `/Users/jaho/development/CLAUDE.md` for the broader family context.

## Still to decide

These choices affect architecture and aren't yet made:
- **Realtime transport** — WebSocket server, SSE, or a hosted realtime DB (e.g. Supabase, Liveblocks, Convex).
- **Persistence** — Prisma + SQLite (matches sibling project `boligjagten/`), Postgres, or whatever the realtime choice dictates.
- **Auth / participant identity** — anonymous join-by-link vs. accounts.
