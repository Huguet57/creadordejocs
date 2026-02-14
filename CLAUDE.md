# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Simple Web Game Creator — a 2D web-first game creation tool focused on intuitive UX, minimal time-to-first-game (<20 min), and a create/edit/run/share/remix loop. No code exists yet; the project is in the planning phase (pre-MVP 0).

## Planned Architecture

Monorepo structure (to be created in MVP 0):
- `apps/editor` — the game editor UI
- `apps/player` — play-only runtime for published games
- `packages/engine-core` — game loop (`update` + `draw`), runtime
- `packages/project-format` — JSON project schema v1, save/load with validation

## Key Design Principles

- **Intuition first**: base flow is `Create -> Edit -> Run -> Share -> Remix`
- **AI-agent friendly by design**: deterministic APIs, stable "commands" layer, atomic operations, observable events/states
- **Iteration safety**: autosave, undo/redo, recovery are non-negotiable
- **i18n from the start**: Catalan as the initial supported language

## Tech Stack (planned)

- TypeScript strict across all packages
- ESLint + Prettier
- Vitest (unit) + Playwright (E2E)
- CI gates: typecheck, lint, test, build

## Key Metrics

The product tracks: `timeToFirstPlayableFun`, `tutorialCompletion`, `publishRate`, `remixRate`, `stuckRate`.

## Documentation

- [Principles](docs/PRINCIPLES.md) — product and engineering principles, tie-breaking criteria
- [Roadmap](docs/ROADMAP.md) — MVP sequence, quarterly cycles, exit criteria
- [MVP 0 TODO](docs/mvp-0-foundation-learning.todo.md) — foundation and quality baseline
- [MVP 1 TODO](docs/mvp-1-first-autonomous-game.todo.md) — core editor UX
- [MVP 2 TODO](docs/mvp-2-learn-core-programming.todo.md) — templates and onboarding
- [MVP 3 TODO](docs/mvp-3-creativity-sharing.todo.md) — share and remix loop
- [MVP 4 TODO](docs/mvp-4-polish-reliability.todo.md) — polish and reliability
