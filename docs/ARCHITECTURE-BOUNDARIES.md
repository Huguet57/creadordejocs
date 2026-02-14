# Architecture Boundaries and Conventions

This document defines package boundaries and coding conventions for MVP 0.

## Monorepo folders

- `apps/editor`: game creation UI and authoring workflows.
- `apps/player`: play-only runtime shell for published projects.
- `packages/engine-core`: deterministic runtime loop contracts (`update` + `draw`).
- `packages/project-format`: versioned JSON schema, validation, save/load helpers.

## Dependency boundaries

- `apps/editor` can depend on `packages/project-format`.
- `apps/player` can depend on `packages/engine-core` and `packages/project-format`.
- `packages/engine-core` must not depend on app code.
- `packages/project-format` must not depend on app code.
- Packages must only expose public APIs via `src/index.ts`.

## Naming and style

- TypeScript strict is mandatory in all workspaces.
- Use explicit, descriptive names and deterministic APIs.
- Keep modules single-purpose and with clear ownership.
- Prefer `type` aliases for shapes in API boundaries.

## i18n baseline

- Initial locale is `ca` (Catalan).
- Locale keys should be stable and shared by meaning, not by UI location.
- New user-facing strings must be added to locale catalogs before usage.
