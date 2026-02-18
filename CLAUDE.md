# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Simple Web Game Creator — a 2D web-first game creation tool focused on intuitive UX, minimal time-to-first-game (<20 min), and a create/edit/run/share/remix loop. The editor is a React SPA; the engine and project format are shared packages.

## Commands

```bash
# Development
npm run editor:dev          # Start editor dev server (Vite, port 5173)

# Quality checks
npm run lint                # ESLint (flat config, TS type-checked rules)
npm run typecheck           # tsc --noEmit across all workspaces
npm run format:check        # Prettier check
npm run check:quick         # lint + typecheck + unit tests (pre-commit hook)

# Tests
npm run test:unit           # Vitest — all unit/integration tests
npm run test:e2e            # Playwright — starts editor dev server automatically
npm run test:all            # Unit + E2E (pre-push hook)

# Run a single unit test file
npx vitest run packages/project-format/src/schema-v1.test.ts

# Build
npm run build               # tsc -b (all workspaces)
npm run editor:build        # Vite production build of the editor
```

## Architecture

npm workspaces monorepo with four workspaces referenced in the root `tsconfig.json`:

- **`packages/project-format`** — Zod-validated project schema v1, save/load helpers, action registry, editor model types. Uses `zod`. Every workspace that touches project data depends on this.
- **`packages/engine-core`** — Deterministic game loop (`update` + `draw` contracts). No app dependencies.
- **`apps/editor`** — React + Vite + Tailwind SPA. Feature-sliced under `src/features/` (editor-state, sprites, objects, rooms, sounds, play, share, templates, assets, landing). Path alias `@/` maps to `apps/editor/src/`. Depends on `project-format`.
- **`apps/player`** — Play-only runtime shell for published projects. Depends on `engine-core` and `project-format`.
- **`apps/share-worker`** — Cloudflare Worker with KV storage for shared game snapshots.

### Dependency boundaries

- Packages must not depend on app code.
- Packages expose public APIs only via `src/index.ts`.
- `apps/editor` depends on `project-format` (not `engine-core`).
- `apps/player` depends on both packages.

### Test layout

- Unit tests: colocated `*.test.ts` files inside packages and `apps/editor/src/`, plus `tests/integration/`.
- E2E tests: `tests/e2e/*.spec.ts` (Playwright, launches editor dev server on port 4173).
- Vitest config resolves workspace aliases so package imports work in tests.

## Key Conventions

- **TypeScript strict** everywhere — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `useUnknownInCatchVariables` are all enabled.
- **`type` over `interface`** — ESLint enforces `@typescript-eslint/consistent-type-definitions: ["error", "type"]`.
- **i18n**: Catalan (`ca`) is the initial locale. User-facing strings go in `apps/editor/src/i18n/ca.ts`. Locale keys are shared by meaning, not UI location.
- **Asset storage**: configurable via `VITE_ASSET_STORAGE_PROVIDER` env var (`indexeddb` default, `supabase` optional). See `apps/editor/.env.example`.
- **Project schema**: defined with Zod in `packages/project-format/src/schema-v1.ts`. The schema handles migration from legacy `actions` arrays to structured `items` (if/repeat/forEach blocks).

## Design Principles

- **Intuition first**: base flow is `Create -> Edit -> Run -> Share -> Remix`
- **AI-agent friendly by design**: deterministic APIs, stable "commands" layer, atomic operations, observable events/states
- **Iteration safety**: autosave, undo/redo, recovery are non-negotiable
- **Tie-breaking**: when in doubt, choose the option that (1) reduces cognitive friction, (2) accelerates first playable game, (3) simplifies APIs, (4) facilitates future AI copilot

## Documentation

- [Principles](docs/PRINCIPLES.md) — product and engineering principles, tie-breaking criteria
- [Architecture Boundaries](docs/ARCHITECTURE-BOUNDARIES.md) — package boundaries and naming conventions
- [Roadmap](docs/ROADMAP.md) — MVP sequence, quarterly cycles, exit criteria
- [ADR-0001](docs/adr-0001-mvp0-foundation.md) — MVP 0 foundation decisions
- MVP TODOs: `docs/mvp-{0..4}-*.todo.md`
