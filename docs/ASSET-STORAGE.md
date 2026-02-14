# Asset Storage Strategy (Agnostic)

The editor uses an abstract storage provider for sprite/sound uploads.

## Active provider

Set in `apps/editor/.env.local`:

```env
VITE_ASSET_STORAGE_PROVIDER=indexeddb
```

Supported values:
- `indexeddb` (default)
- `supabase` (optional adapter)

## Why this design

- Keep MVP simple with local-only storage.
- Avoid lock-in to one backend.
- Enable future migration to Supabase, AWS S3, Cloudflare R2, or another provider without changing editor UI components.

## Provider contract

Each provider returns:
- `assetSource`: value stored in project JSON
- `storagePath`: provider-specific path/id

The editor only depends on this contract and does not care which backend is used.

## IndexedDB provider (current default)

- Upload stores the file blob in browser IndexedDB.
- `assetSource` is stored as `asset://indexeddb/<id>`.
- Works offline and requires no backend.

## Supabase provider (optional)

To use it, set:

```env
VITE_ASSET_STORAGE_PROVIDER=supabase
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_SUPABASE_BUCKET=game-assets
```

The existing setup guide is in `docs/SUPABASE-LOCAL-ASSETS.md`.
