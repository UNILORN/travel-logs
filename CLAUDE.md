# CLAUDE.md — たびログ (Travel Logs)

This file documents the codebase structure, conventions, and development workflows for AI assistants working on this repository.

## Project Overview

**たびログ** is a mobile-first Next.js travel planning app. Users manage trips in a "bookshelf" UI, build itineraries on a timeline, view spots on a map, track a budget, and review a trip report with charts.

All state is held in memory via React Context — there is no database or persistence layer. Reloading the page resets all edits to the initial mock data.

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.7 (strict mode) |
| UI runtime | React 19 |
| Styling | Tailwind CSS v4 |
| UI primitives | shadcn/ui pattern (`components/ui/`) using Radix UI |
| Icons | Lucide React |
| Charts | Recharts |
| Maps | Leaflet + react-leaflet |
| Forms | react-hook-form + zod |
| Notifications | Sonner |
| Package manager | pnpm (lockfile: `pnpm-lock.yaml`) |

## Directory Structure

```
travel-logs/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (TripProvider, ThemeProvider)
│   ├── globals.css               # Global CSS (Tailwind entry point)
│   ├── page.tsx                  # "/" — Bookshelf (trip list)
│   ├── api/
│   │   └── spot-search/
│   │       └── route.ts          # GET /api/spot-search — Foursquare proxy
│   └── trip/[id]/
│       ├── layout.tsx            # generateStaticParams (for GitHub Pages export)
│       ├── edit/page.tsx         # "/trip/[id]/edit" — Timeline editor
│       ├── navigate/page.tsx     # "/trip/[id]/navigate" — Map view
│       ├── budget/page.tsx       # "/trip/[id]/budget" — Budget manager
│       └── report/page.tsx       # "/trip/[id]/report" — Trip report/charts
│
├── components/
│   ├── bookshelf/                # Bookshelf page components
│   │   └── new-trip-dialog.tsx
│   ├── itinerary/                # Timeline / itinerary editor
│   │   ├── timeline.tsx
│   │   ├── itinerary-header.tsx
│   │   └── add-spot-dialog.tsx
│   ├── budget/                   # Budget page components
│   │   ├── budget-gauge.tsx
│   │   ├── expense-form.tsx
│   │   └── expense-list.tsx
│   ├── navigation/               # Map page components
│   │   └── map-view.tsx
│   ├── report/                   # Report page components
│   │   ├── distance-chart.tsx
│   │   ├── spending-chart.tsx
│   │   ├── transport-chart.tsx
│   │   └── stat-card.tsx
│   ├── shared/
│   │   └── bottom-nav.tsx        # Bottom navigation bar (shared across trip pages)
│   ├── theme-provider.tsx
│   └── ui/                       # Shared shadcn/ui-style primitives (do not add app logic here)
│
├── hooks/
│   ├── use-mobile.ts             # Viewport breakpoint hook
│   └── use-toast.ts              # Toast notification hook
│
├── lib/
│   ├── types.ts                  # All shared TypeScript interfaces and label maps
│   ├── trip-context.tsx          # Global state (TripProvider + useTripContext)
│   ├── mock-data.ts              # Seed data loaded on startup
│   └── utils.ts                  # Utility helpers (e.g., cn() for Tailwind class merging)
│
├── public/                       # Static assets (icons, placeholder images)
├── styles/globals.css            # Duplicate entry for global CSS (also app/globals.css)
├── components.json               # shadcn/ui configuration
├── next.config.mjs               # Next.js config (GitHub Pages static export support)
├── tsconfig.json                 # TypeScript config (strict, @/* alias)
├── postcss.config.mjs
└── .github/workflows/
    ├── pr-preview-pages.yml      # Deploy PR preview to GitHub Pages
    └── pr-preview-pages-cleanup.yml
```

## Data Model (`lib/types.ts`)

### `Trip`
The top-level entity. Key fields:
- `id`, `title`, `destination`, `coverImage`, `startDate`, `endDate`
- `status`: `'planning' | 'traveling' | 'archived'`
- `members`: `{ adults: number; children: number }`
- `budget`: total budget in yen
- `spots`: legacy `Spot[]` (kept for compatibility)
- `nodes?`: new `TimelineNode[]` (preferred model)
- `expenses`: `Expense[]`

### Timeline nodes (new model)
Three discriminated union members under `TimelineNode`:

| Type | Key fields |
|---|---|
| `SpotNode` | `type:'spot'`, name, time, endTime, day, address, lat, lng, image, notes |
| `MoveNode` | `type:'move'`, name, time, endTime, day, transport, distance, notes, optional from/to coords |
| `AreaNode` | `type:'area'`, name, time, endTime, day, spotNames[], notes |

### `Spot` (legacy model)
Stores inbound movement info on the spot itself (`transport`, `distance`). The context converts legacy spots into `SpotNode` + `MoveNode` pairs when `nodes` is not yet initialized.

### `Expense`
Fields: `id`, `category`, `name`, `adultPrice`, `childPrice`, `total`.
`total` is auto-calculated: `adultPrice × adults + childPrice × children`.

Categories: `transport | accommodation | activity | food | other`

### Label maps (exported constants)
- `CATEGORY_LABELS` — Japanese labels for expense categories
- `TRANSPORT_LABELS` — Japanese labels for transport types
- `STATUS_LABELS` — Japanese labels for trip statuses

## State Management (`lib/trip-context.tsx`)

`TripProvider` wraps the entire app (in `app/layout.tsx`) and exposes state via `useTripContext()`.

**Key context actions:**
```ts
getTrip(id)                              // look up a trip
addTrip(tripData)                        // create new trip, returns id
updateTrip(id, updates)                  // partial update
deleteTrip(id)
addSpot(tripId, spot)                    // legacy spot + syncs nodes
updateSpot(tripId, spotId, updates)      // legacy spot + syncs move node
removeSpot(tripId, spotId)
addNode(tripId, node)                    // new timeline node
removeNode(tripId, nodeId)
addExpense(tripId, expense)
removeExpense(tripId, expenseId)
archiveTrip(tripId)
```

**Migration note:** When `trip.nodes` is `undefined` and `addNode` is called, the context converts all legacy `spots` to nodes via `buildNodesFromLegacySpots()` first. Both `spots` and `nodes` are kept in sync during the migration period.

All IDs are generated with `Date.now()` (e.g., `spot-${Date.now()}`).

## Routing & Pages

| Route | Purpose | Client/Server |
|---|---|---|
| `/` | Bookshelf — list all trips | Client |
| `/trip/[id]/edit` | Timeline editor (display & edit modes) | Client |
| `/trip/[id]/navigate` | Leaflet map with spot markers | Client |
| `/trip/[id]/budget` | Budget gauge + expense list/form | Client |
| `/trip/[id]/report` | Charts: spending, distance, transport | Client |
| `/api/spot-search` | Foursquare autocomplete/place-details proxy | Server (Route Handler) |

All trip sub-pages consume `useTripContext()`. `app/trip/[id]/layout.tsx` exports `generateStaticParams` so the GitHub Pages static export can pre-render trip pages.

## API: Spot Search (`app/api/spot-search/route.ts`)

**Endpoint:** `GET /api/spot-search`

**Query parameters:**
- `q` — search query (min 2 chars)
- `fsq_id` — fetch details for a specific Foursquare place ID
- `limit` — result count (1–10, default 6)
- `lang` — language (default `ja`)
- `ll` — lat,lng bias (falls back to `FOURSQUARE_SEARCH_LL` env var)
- `radius` — search radius in meters (falls back to `FOURSQUARE_SEARCH_RADIUS`)
- `session_token` — optional Foursquare session token

**Environment variables (`.env.local`):**
```env
# Required for spot search (one of the following):
FOURSQUARE_SERVICE_API_KEY=your_key_here
# or (typo variant kept for backward compatibility):
FOURSQARE_SERVICE_API_KEY=your_key_here
# or legacy:
FOURSQUARE_API_KEY=your_key_here

# Optional:
FOURSQUARE_API_VERSION=2025-06-17   # default
FOURSQUARE_SEARCH_LL=35.681236,139.767125
FOURSQUARE_SEARCH_RADIUS=30000
```

Spot search is **not required** — the dialog accepts manual entry without it.

**Static export note:** During GitHub Pages PR preview builds, `app/api/` is temporarily moved to `.app-api-disabled-for-pages-preview/` because static export does not support Route Handlers.

## Development Commands

All commands use `pnpm`:

```bash
pnpm install              # install dependencies
pnpm dev                  # local dev server → http://localhost:3000
pnpm build                # production build
pnpm start                # serve production build
pnpm lint                 # ESLint (requires eslint to be installed)
pnpm exec tsc --noEmit    # TypeScript type check (no emitted files)
```

**Known issue:** `eslint` is not listed in `devDependencies`, so `pnpm lint` may fail in a clean install until it is added.

## Coding Conventions

### TypeScript
- Strict mode enabled (`tsconfig.json`).
- `typescript.ignoreBuildErrors: true` in `next.config.mjs` — the build will succeed even with type errors, but run `pnpm exec tsc --noEmit` locally to catch them.
- Use the `@/*` import alias for all internal imports (resolves from project root).

### Naming
- **Component exports:** `PascalCase` (e.g., `export function BudgetGauge()`)
- **File names:** `kebab-case` (e.g., `budget-gauge.tsx`)
- **Hooks:** `useXxx` naming, placed in `hooks/` or `components/ui/`

### Component placement
- Feature-specific components → `components/<feature>/` (e.g., `components/budget/`)
- Shared UI primitives (no app logic) → `components/ui/`
- App-level state and types → `lib/`

### Tailwind CSS
- Use `cn()` from `lib/utils.ts` (wraps `clsx` + `tailwind-merge`) for conditional class composition.
- Tailwind v4 — configuration is primarily CSS-based (no `tailwind.config.js`).

### Forms
- Use `react-hook-form` with `zod` resolvers for validated forms.

## GitHub Actions / CI

### PR Preview (`pr-preview-pages.yml`)
Triggered on PR open/update/reopen. Workflow:
1. Installs dependencies with `pnpm --frozen-lockfile`
2. Temporarily disables `app/api/` (static export incompatibility)
3. Runs `pnpm build` with `GITHUB_PAGES_PR_PREVIEW=1` and a computed `basePath`
4. Deploys `./out` to the `gh-pages` branch under `pr-preview/pr-<number>/`
5. Comments the preview URL on the PR

**Preview limitations (enforced via `NEXT_PUBLIC_GITHUB_PAGES_PR_PREVIEW=1`):**
- New trip creation is disabled
- Spot search API is disabled
- A banner is shown in the UI to explain the constraints

### PR Preview Cleanup (`pr-preview-pages-cleanup.yml`)
Cleans up the preview directory from `gh-pages` when a PR is closed.

## Testing

No test framework is configured (no Jest, Vitest, or Playwright). Verification is done manually via:
1. `pnpm dev` + manual browser testing
2. `pnpm exec tsc --noEmit` for type checking

When adding tests, place them adjacent to the source (`*.test.ts[x]`) or in `__tests__/`, and add a `test` script to `package.json`.

## Commit & PR Guidelines

Use short imperative commit messages:
- `Add trip report distance chart`
- `Fix budget gauge overflow on small screens`
- `Refactor spot search to use new Foursquare autocomplete endpoint`

PRs should include:
- Summary of changes
- Link to related issue/task if applicable
- Screenshots or recordings for any UI changes
- Manual verification checklist: `pnpm dev` tested, relevant routes exercised, `tsc --noEmit` clean

## Security Notes

- Never commit secrets. Use `.env.local` for API keys (it is gitignored).
- The `.gitignore` explicitly excludes `.env`, `.env*.local`, and `node_modules/`.
- The spot search API route proxies Foursquare and must not expose the API key to the client.
- `NEXT_PUBLIC_*` variables are embedded in the client bundle — do not use them for secrets.
