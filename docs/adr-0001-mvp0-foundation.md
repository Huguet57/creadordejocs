# ADR-0001: MVP 0 foundation baseline

## Status

Accepted

## Context

The project starts from zero and needs a robust technical baseline that prevents regressions
while keeping iteration speed high.

## Decision

- Use a TypeScript monorepo with workspaces for apps and packages.
- Enforce strict TypeScript, ESLint, and Prettier from the first commit.
- Gate quality with CI jobs: `typecheck`, `lint`, `test`, and `build`.
- Start with a versioned and validatable project format (`schema v1`).
- Keep runtime loop contract deterministic (`update` then `draw`).
- Enable i18n from day one with `ca` as the initial locale.

## Consequences

- Higher initial setup cost, but lower long-term technical debt.
- Faster onboarding and safer refactors due to stable boundaries.
- Better readiness for future AI-assisted workflows through clear contracts.
