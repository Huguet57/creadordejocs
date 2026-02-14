# ROADMAP - Simple Web Game Creator

This roadmap prioritizes an intuitive game creator with low time-to-first-game and a complete create/edit/share/remix loop.

## North Star

- `timeToFirstPlayableFun` < 20 minutes (not just "run", but a minimally playable game).
- Highly intuitive UX for creating, editing, and iterating.
- One-click sharing and remixing other people's projects.
- Simple 2D web-first scope (no AAA or classroom focus).

## Current Priority

1. Core UX: create/edit/run/save/undo.
2. Templates + ultra-short onboarding.
3. Share + remix loop.
4. Polish: pedagogical errors, simple debugging, performance, and stability.

## MVP Sequence

1. MVP 0 - Foundation and Quality Baseline
2. MVP 1 - Core Editor UX (Create/Edit/Run/Save)
3. MVP 2 - First Playable Fast (Templates and Guided Flow)
4. MVP 3 - Share and Remix Loop
5. MVP 4 - Polish, Reliability and Delight

## Dependencies between MVPs

- MVP 1 depends on:
  - technical foundation from MVP 0
  - clear contracts between editor/runtime/project format
- MVP 2 depends on:
  - stable editing flow from MVP 1
  - essential events/actions working
- MVP 3 depends on:
  - templates and stable first game from MVP 2
  - robust save/load system
- MVP 4 depends on:
  - real usage of sharing/remix from MVP 3
  - reliable metrics to prioritize improvements

## Roadmap by cycles (2 weeks each)

## Q1 - Foundation + Core UX

- Cycle 0.1 (MVP 0): monorepo, TS strict, lint, test, CI.
- Cycle 0.2 (MVP 0): base runtime, schema v1, telemetry baseline.
- Cycle 1.1 (MVP 1): minimal editor (resources/objects/rooms), run/reset.
- Cycle 1.2 (MVP 1): autosave, undo/redo, short history, state recovery.

Exit criteria Q1:
- p95 editor load < 3s.
- crash-free sessions > 99%.
- 0 data loss in manual and E2E tests.

## Q2 - First Playable Fast

- Cycle 2.1 (MVP 2): 5-7 min onboarding + 15-20 min main tutorial.
- Cycle 2.2 (MVP 2): 3-5 premium templates and pedagogical error messages.

Exit criteria Q2:
- `timeToFirstPlayableFun` < 20 min.
- >60% complete the first tutorial.
- >50% reach a finishable game starting from a template.

## Q3 - Share and Remix

- Cycle 3.1 (MVP 3): one-click publishing, stable URL, and play-only page.
- Cycle 3.2 (MVP 3): fork/remix, automatic credit, and version history.

Exit criteria Q3:
- >40% of projects published.
- >25% of projects remixed (remix/fork).
- publish time p95 < 30s.

## Q4 - Polish and Reliability

- Cycle 4.1 (MVP 4): simple debugging (pause/step/watch), actionable errors.
- Cycle 4.2 (MVP 4): performance optimization, stability, fine UX improvements.

Exit criteria Q4:
- stable frame time in reference scenes.
- reduction of `stuckRate` for frequent errors.
- session-to-session retention improvement.

## Cycle governance (always)

- Plan:
  - define a concrete product objective for the cycle
  - specify non-goals
- Build:
  - complete vertical slice (editor + runtime + save/share + tests)
- Validate:
  - typecheck, lint, tests, e2e smoke
  - mini playtest with target users
- Measure:
  - `timeToFirstPlayableFun`, `tutorialCompletion`, `publishRate`, `remixRate`, `stuckRate`
- Adjust:
  - retrospective and Must/Should/Could reprioritization for the next cycle

## Links to detailed TODOs

- [Principles](./PRINCIPLES.md)
- [MVP 0 TODO](./mvp-0-foundation-learning.todo.md)
- [MVP 1 TODO](./mvp-1-first-autonomous-game.todo.md)
- [MVP 2 TODO](./mvp-2-learn-core-programming.todo.md)
- [MVP 3 TODO](./mvp-3-creativity-sharing.todo.md)
- [MVP 4 TODO](./mvp-4-polish-reliability.todo.md)
