# MVP 0 - Foundation and Quality Baseline TODO

Objective: establish a robust technical foundation to iterate quickly without regressions or initial debt.

## Cycle 0.1 - Monorepo and quality gates

### Must
- [x] Create monorepo with `apps/editor`, `apps/player`, `packages/engine-core`, `packages/project-format`.
- [x] Configure `TypeScript` strict in all packages.
- [x] Configure `ESLint` + `Prettier` with shared scripts.
- [x] Configure CI with gates: typecheck, lint, test, build.
- [x] Define code conventions, folder structure, and boundaries between packages.
- [x] Set up i18n support from the start with Catalan as the initial supported language.

### Should
- [x] Add unit test template (`Vitest`) and E2E smoke test (`Playwright`) for the minimal flow.
- [x] Create initial ADR with architecture decisions.

### Could
- [ ] Add automatic canary deployment for each PR.
- [ ] Add basic error dashboard (Sentry or equivalent).

## Cycle 0.2 - Base runtime and project v1

### Must
- [ ] Implement base game loop in the runtime (`update` + `draw`) with a stable contract.
- [ ] Implement JSON project format `schema v1`.
- [ ] Implement project save/load with schema validation.
- [ ] Instrument base metrics (`appStart`, `projectLoad`, runtime errors).
- [ ] Deliver a "Hello Scene" demo verifiable via CI.

### Should
- [ ] Add basic error messages for internal development.
- [ ] Add `timeToFirstPlayableFun` telemetry (baseline).

### Could
- [ ] Add initial performance benchmark (reference scene).

## MVP 0 Exit KPIs
- [ ] crash-free sessions > 99% in internal testing.
- [ ] p95 editor load < 3s in reference environment.
- [ ] initial `timeToFirstPlayableFun` measured and reported.
