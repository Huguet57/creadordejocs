# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Simple Web Game Creator — a 2D web-first game creation tool focused on intuitive UX, minimal time-to-first-game (<20 min), and a create/edit/run/share/remix loop. The editor is a React SPA; the engine and project format are shared packages.

## Commands

```bash
# Development
npm run editor:dev          # Start editor dev server (Vite, port 5173)
npm run run:local           # Start local Supabase + refresh env + editor dev server

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

### Editor state management

No external state library (no Zustand/Redux). The editor uses **plain React `useState` + a central custom hook**:

- **`useEditorController()`** (`apps/editor/src/features/editor-state/use-editor-controller.ts`) — single hook that owns all editor state (project, active IDs, runtime state, sync/save status, auth) and exposes action methods. This is the main integration point.
- **Feature-local state** — individual features manage their own UI state with separate hooks (e.g., `useSpriteEditorState()` for tool, color, zoom). This state does not live in the controller.

### Action system

- **`ACTION_REGISTRY`** (`packages/project-format/src/action-registry.ts`) — ~30 action types with metadata (label, category, editor visibility). Categories: movement, objects, game, variables, rooms, flow.
- **Action handlers** (`apps/editor/src/features/editor-state/action-handlers.ts`) — runtime execution of actions given an `ActionContext`, returning `RuntimeActionResult` with state mutations.
- **Runtime event executor** (`apps/editor/src/features/editor-state/runtime-event-executor.ts`) — executes action trees recursively, handles if/repeat/forEach flow control. `MAX_FLOW_ITERATIONS = 500` prevents infinite loops.
- **Value expressions** — union type (`ValueExpressionOutput`) supporting literals, global variables, mouse attributes, iteration variables, random values, etc.

### Supabase integration

- **Auth**: `apps/editor/src/features/auth/supabase-auth.ts` — resolves `SupabaseAuthUser` from session, supports anonymous + OAuth. `subscribeToSupabaseAuthUser()` for reactive state.
- **Project sync**: `apps/editor/src/features/storage/project-sync.ts` — offline-first outbox pattern. `enqueueProjectUpsert()`/`enqueueProjectDelete()` queue changes locally; merges local and remote on sync.
- **Asset storage**: hybrid model — `HybridSupabaseAssetStorageProvider` queues uploads when offline, falls back to `IndexedDbAssetStorageProvider`. Asset URLs prefixed `asset://indexeddb/` for local or Supabase URLs for remote.
- **Local-only user ID**: `__local__` scopes projects when unauthenticated; transitions on sign-in.

### Dependency boundaries

- Packages must not depend on app code.
- Packages expose public APIs only via `src/index.ts`.
- `apps/editor` depends on `project-format` (not `engine-core`).
- `apps/player` depends on both packages.

### Test layout

- Unit tests: colocated `*.test.ts` files inside packages and `apps/editor/src/`, plus `tests/integration/`.
- E2E tests: `tests/e2e/*.spec.ts` (Playwright, launches editor dev server on **port 4173**, not 5173).
- Vitest config resolves workspace aliases so package imports work in tests.
- **Git hooks**: pre-commit runs `lint → typecheck → unit tests`; pre-push runs `unit tests → E2E tests`.

## Key Conventions

- **TypeScript strict** everywhere — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `useUnknownInCatchVariables` are all enabled.
- **`type` over `interface`** — ESLint enforces `@typescript-eslint/consistent-type-definitions: ["error", "type"]`.
- **Formatting**: Prettier with `semi: false`, `singleQuote: false`, `trailingComma: "none"`, `printWidth: 100`.
- **i18n**: Catalan (`ca`) is the initial locale. User-facing strings go in `apps/editor/src/i18n/ca.ts` as a typed const object (`caMessages`); no i18n framework. Locale keys are shared by meaning, not UI location.
- **Asset storage**: configurable via `VITE_ASSET_STORAGE_PROVIDER` env var (`supabase` default with IndexedDB fallback queue, `indexeddb` local-only). See `apps/editor/.env.example`.
- **Project schema**: defined with Zod in `packages/project-format/src/schema-v1.ts`. The schema handles migration from legacy `actions` arrays to structured `items` (if/repeat/forEach blocks).
- **Environment tiers**: `npm run run:local` (local Supabase), `npm run run:remote` (remote Supabase), or plain `npm run editor:dev` (uses current `.env.local`).

## Design Principles

- **Intuition first**: base flow is `Create -> Edit -> Run -> Share -> Remix`
- **AI-agent friendly by design**: deterministic APIs, stable "commands" layer, atomic operations, observable events/states
- **Iteration safety**: autosave, undo/redo, recovery are non-negotiable
- **Tie-breaking**: when in doubt, choose the option that (1) reduces cognitive friction, (2) accelerates first playable game, (3) simplifies APIs, (4) facilitates future AI copilot

## Documentation

- [Principles](docs/PRINCIPLES.md) — product and engineering principles, tie-breaking criteria
- [Architecture Boundaries](docs/ARCHITECTURE-BOUNDARIES.md) — package boundaries and naming conventions
- [Roadmap](docs/ROADMAP.md) — MVP sequence, quarterly cycles, exit criteria
