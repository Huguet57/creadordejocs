# Supabase Local Setup for Editor Assets

This guide enables real sprite and sound uploads from the editor using Supabase Storage.

## 1) Configure Google OAuth env (for social login)

Create local auth env file:

```sh
cp supabase/google-auth.env.example supabase/.env.local
```

Fill it with your Google OAuth credentials.

## 2) Start Supabase local stack

From repository root:

```sh
npm run supabase:init
npm run supabase:start
```

`npm run supabase:start` automatically loads `supabase/.env.local` if present.

Get local project details:

```sh
npm run supabase:status
```

Copy these values:
- API URL (usually `http://127.0.0.1:54421`)
- `anon key`

## 3) Configure editor environment

Create `apps/editor/.env.local` from `apps/editor/.env.example` and fill values:

```env
VITE_ASSET_STORAGE_PROVIDER=supabase
VITE_SUPABASE_URL=http://127.0.0.1:54421
VITE_SUPABASE_ANON_KEY=<anon-key-from-supabase-status>
VITE_SUPABASE_BUCKET=game-assets
VITE_ENABLE_SUPABASE_AUTH=true
VITE_SUPABASE_AUTH_REDIRECT_TO=http://127.0.0.1:5173/editor
```

## 4) Create public bucket for MVP

Open Supabase Studio (`http://127.0.0.1:54423`) and create a Storage bucket:
- Name: `game-assets` (or your `VITE_SUPABASE_BUCKET` value)
- Public bucket: enabled

## 5) Run editor

```sh
npm run editor:dev
```

In the editor:
- Upload a sprite image (`png`, `jpg`, `jpeg`, `gif`, `webp`)
- Upload a sound (`wav`, `mp3`, `ogg`)
- `assetSource` should become a Supabase URL.

## Notes

- Current MVP uses a public bucket to unblock workflow.
- Next phase can switch to private bucket + signed URLs by replacing the URL builder in the upload service.
- Stop local services when done:

```sh
npm run supabase:stop
```
