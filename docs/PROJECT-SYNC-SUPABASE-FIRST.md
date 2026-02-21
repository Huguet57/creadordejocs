# Project Sync (Supabase-first)

This document describes the project persistence model used by the editor.

## Source of truth

- Supabase (`public.projects`) is the canonical store for projects.
- Local browser storage (`IndexedDB` via KV provider) is a scoped cache plus offline queue.
- Snapshots remain local-only.

## User scope

- Local cache keys are scoped by `userId` (`v3` keys).
- Anonymous users get their own Supabase user/session and therefore their own scope.
- On anonymous -> registered upgrade, local project cache and pending project outbox items are copied to the new scope before sync.

## Save flow

1. Project is written to local scoped cache.
2. A project upsert operation is enqueued in `project-outbox`.
3. Sync loop flushes outbox to Supabase with retry backoff.

## Delete flow

1. Project is removed from local scoped cache.
2. A project delete operation is enqueued.
3. Sync loop flushes delete to Supabase.

## Merge/conflicts

- Catalog merge uses `updated_at` (LWW).
- If timestamps are equal but `project_source` differs:
  - remote wins for active merge result,
  - local version is preserved as a new conflict copy (`"<name> (conflict YYYY-MM-DD HH:mm)"`).

## Legacy import (v2 local keys)

- Legacy local projects are detected.
- User is prompted to import them manually.
- A manual menu action allows re-import (`Game -> Importar projectes locals antics...`).

