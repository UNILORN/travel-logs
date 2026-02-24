# Repository Guidelines

## Project Structure & Module Organization
This repository is a Next.js App Router project (TypeScript) for a travel log UI.

- `app/`: routes and page entry points (`app/page.tsx`, `app/trip/[id]/*/page.tsx`)
- `components/`: feature UI (`bookshelf/`, `budget/`, `navigation/`, `report/`, etc.)
- `components/ui/`: shared shadcn/ui-style primitives
- `hooks/`: reusable client hooks (`use-mobile`, `use-toast`)
- `lib/`: shared types, utilities, and app state (`trip-context`, `utils`, `types`)
- `public/`: static assets/icons/images
- `styles/` and `app/globals.css`: global styling

Use the `@/*` import alias (configured in `tsconfig.json`) for internal imports.

## Build, Test, and Development Commands
Use `pnpm` (lockfile is `pnpm-lock.yaml`).

- `pnpm dev`: start local dev server (`next dev`)
- `pnpm build`: production build (`next build`)
- `pnpm start`: run the built app (`next start`)
- `pnpm lint`: run ESLint across the repo (`eslint .`)

Optional local check (not scripted): `pnpm exec tsc --noEmit` for TypeScript type validation.

## Coding Style & Naming Conventions
- Language: TypeScript + React (strict mode enabled in `tsconfig.json`)
- Indentation: follow existing file style (2 spaces in JSON/config, standard TS formatting in code)
- Components/files: `PascalCase` component exports, `kebab-case` filenames (for example `new-trip-dialog.tsx`)
- Hooks: `useXxx` naming in `hooks/` or `components/ui/`
- Prefer feature-based placement (`components/report/*`, `components/budget/*`) over generic folders

Keep shared UI primitives in `components/ui/` and app-specific logic in feature components or `lib/`.

## Testing Guidelines
No test framework is configured yet (no `test` script, Jest/Vitest/Playwright config absent).

When adding tests, place them near the code (`*.test.ts[x]`) or in a clear `__tests__/` folder and document the command in `package.json`.

## Commit & Pull Request Guidelines
Git history currently has only an initial commit (`initialize commit`), so no established convention exists yet.

Use short, imperative commit messages (for example, `Add trip report charts` or `Fix budget gauge rendering`).

PRs should include:
- clear summary of changes
- linked issue/task (if available)
- screenshots or recordings for UI changes
- manual verification steps (`pnpm dev`, route checked, lint status)

## Security & Configuration Tips
Do not commit secrets. Use `.env.local` for local environment variables if introduced later.
