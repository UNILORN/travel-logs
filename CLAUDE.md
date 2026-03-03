# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**たびログ** is a mobile-first Next.js travel planning app. Users manage trips in a "bookshelf" UI, build itineraries on a timeline, view spots on a map, track a budget, and review a trip report with charts.

All state is held in memory via React Context — there is no database or persistence layer. Reloading the page resets all edits to the initial mock data.

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.7 (strict mode) |
| UI runtime | React 19 |
| Styling | Tailwind CSS v4 (CSS-based config, no `tailwind.config.js`) |
| UI primitives | shadcn/ui pattern (`components/ui/`) using Radix UI |
| Icons | Lucide React |
| Charts | Recharts |
| Maps | Leaflet + react-leaflet |
| Forms | react-hook-form + zod |
| Notifications | Sonner |
| Package manager | pnpm |

## Development Commands

```bash
pnpm dev                  # local dev server → http://localhost:3000
pnpm build                # production build (static export for GitHub Pages)
pnpm exec tsc --noEmit    # TypeScript type check
```

`typescript.ignoreBuildErrors: true` is set in `next.config.mjs` — the build succeeds even with type errors, so always run `tsc --noEmit` to verify.

No test framework is configured. Verification is done manually via `pnpm dev`.

## Architecture

### State Management

`TripProvider` in `lib/trip-context.tsx` wraps the entire app and is the single source of truth. All pages consume `useTripContext()`. There is no server state or persistence.

Key context actions: `getTrip`, `addTrip`, `updateTrip`, `deleteTrip`, `addNode`, `removeNode`, `addExpense`, `removeExpense`, `archiveTrip`.

All IDs are generated with `Date.now()` (e.g., `spot-${Date.now()}`).

### Data Model (`lib/types.ts`)

**`Trip`** — top-level entity with `id`, `title`, `destination`, `startDate`, `endDate`, `status`, `members`, `budget`, `spots` (legacy), `nodes?` (new), `expenses`.

**`TimelineNode`** — discriminated union (preferred model):
- `SpotNode` (`type:'spot'`) — place with lat/lng, time, address
- `MoveNode` (`type:'move'`) — transport segment with distance/mode
- `AreaNode` (`type:'area'`) — area with a list of spot names

**`Spot`** (legacy) — stores inbound movement on the spot itself. When `trip.nodes` is `undefined` and `addNode` is called, the context auto-migrates all legacy spots via `buildNodesFromLegacySpots()`. Both `spots` and `nodes` are kept in sync during the migration period.

**`Expense`** — `adultPrice × adults + childPrice × children` auto-calculates `total`.

### Routing

All trip sub-pages are client components consuming `useTripContext()`.

| Route | Purpose |
|---|---|
| `/` | Bookshelf — list all trips |
| `/trip/[id]/edit` | Timeline editor |
| `/trip/[id]/navigate` | Leaflet map |
| `/trip/[id]/budget` | Budget gauge + expense list |
| `/trip/[id]/report` | Charts (spending, distance, transport) |
| `/api/spot-search` | Foursquare autocomplete proxy (server-only) |

`app/trip/[id]/layout.tsx` exports `generateStaticParams` for GitHub Pages static export pre-rendering.

### Spot Search API (`app/api/spot-search/route.ts`)

Proxies Foursquare Places API. Key env vars:
```env
FOURSQUARE_SERVICE_API_KEY=...   # required (also accepts FOURSQARE_SERVICE_API_KEY or FOURSQUARE_API_KEY)
FOURSQUARE_SEARCH_LL=35.681236,139.767125  # optional bias
FOURSQUARE_SEARCH_RADIUS=30000             # optional radius in meters
```

Spot search is optional — the dialog accepts manual entry without it.

During GitHub Pages PR preview builds, `app/api/` is temporarily moved to `.app-api-disabled-for-pages-preview/` because static export does not support Route Handlers.

## Coding Conventions

- **Imports:** Use `@/*` alias for all internal imports.
- **Components:** `PascalCase` exports, `kebab-case` filenames. Feature-specific → `components/<feature>/`; shared primitives (no app logic) → `components/ui/`.
- **Tailwind:** Use `cn()` from `lib/utils.ts` (`clsx` + `tailwind-merge`) for conditional classes.
- **Forms:** `react-hook-form` + `zod` resolvers.

## GitHub Actions / CI

### PR Preview (`pr-preview-pages.yml`)
On PR open/update: disables `app/api/`, builds with `GITHUB_PAGES_PR_PREVIEW=1` and computed `basePath`, deploys `./out` to `gh-pages` branch under `pr-preview/pr-<number>/`, and comments the preview URL.

**Preview limitations** (enforced via `NEXT_PUBLIC_GITHUB_PAGES_PR_PREVIEW=1`): new trip creation and spot search are disabled, and a banner is shown.

### PR Preview Cleanup (`pr-preview-pages-cleanup.yml`)
Cleans up the preview directory when a PR is closed.
