# PRINCIPLES

This document defines the product and engineering principles of the game creator.
It serves as a guide for prioritizing decisions, avoiding scope creep, and maintaining consistency over time.

## 1) Intuition first

- The number one priority is that creating a game feels intuitive.
- The user should quickly understand "what is happening" and "what can I do now".
- If a feature is powerful but confuses new users, it does not belong in the core.
- The base flow should always be visible and simple:
  - `Create -> Edit -> Run -> Share -> Remix`.

## 2) Minimum time-to-first-game

- Main objective: reach a first playable game in under 20 minutes.
- Every product decision is evaluated by its direct impact on this time.
- Templates, onboarding, and immediate feedback take priority over advanced features.

## 3) Clear product organization

- Information and tools organized by task, not by internal complexity.
- Fewer visible options at the beginning, more options as the user progresses.
- Consistent names, menus, and messages throughout the product.
- Predictable structure: the same concept always lives in the same place.

## 4) Clear and structured APIs

- Small, coherent APIs with stable contracts.
- Consistent naming, strong types, and descriptive errors.
- Avoid undocumented "magic behavior".
- Prefer modular composition over coupling between modules.
- Each module should have a single responsibility and a clear boundary.

## 5) AI-agent friendly by design

- The system should be easily consumable by AI agents in the future.
- APIs should be:
  - deterministic whenever possible
  - self-explanatory (names, schemas, errors)
  - observable (readable events and states)
- Expose operations in clear, atomic steps (e.g.: create object, assign event, add action, run preview).
- Maintain a versioned and validatable project data model.
- Define a stable "commands" layer to enable a future copilot that can:
  - create parts of the game
  - propose safe changes
  - help unblock errors
  - explain what it has modified

## 6) Iteration safety

- Never lose the user's work: autosave, undo/redo, and recovery are always top priority.
- Any destructive change must require confirmation or have rollback.
- Saving state must be reliable before any "nice-to-have" feature.

## 7) Feedback and errors that teach

- Error messages in clear language: cause -> impact -> recommended next step.
- The system should suggest "what to try now" when it detects the user is stuck.
- Simple and visible debugging (pause, step, watch) before complex tools.

## 8) Sharing and remixing as the main loop

- One-click publishing is not an extra — it is a central part of the product.
- Remixing projects should be easy and safe.
- The creative social loop (`share -> remix -> republish`) accelerates learning and retention.

## 9) Sustained technical quality

- TypeScript strict, lint, tests, and CI are mandatory from the start.
- Never accept regressions in core flows to add new features.
- Measure continuously: `timeToFirstPlayableFun`, `tutorialCompletion`, `publishRate`, `remixRate`, `stuckRate`.

## 10) Decision criteria (tie-breaker)

When in doubt between two options, choose the one that:

1. reduces usage and cognitive friction,
2. accelerates the first playable game,
3. simplifies APIs and architecture,
4. facilitates future AI copilot integration.
