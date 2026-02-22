# Supabase Local Setup (Parity Mode)

Aquesta guia deixa l'editor en mode local amb el mateix contracte d'env que remot.

## 1) Arrenca Supabase local

Des de l'arrel del repo:

```sh
npm run supabase:start
```

## 2) Aplica migracions locals (inclou bucket/policies)

```sh
supabase migration up --local --include-all
```

La migracio `00003_create_game_assets_bucket_and_policies.sql` crea el bucket `game-assets` i les policies necessaries.

## 3) Refresca credencials locals i activa target local

```sh
npm run supabase:env:refresh:local
npm run env:local
npm run env:status
```

Aixo actualitza:

- `apps/editor/.env.local.local`
- `apps/editor/.env.local`

amb les claus requerides:

- `VITE_ASSET_STORAGE_PROVIDER=supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_BUCKET=game-assets`
- `VITE_ENABLE_SUPABASE_AUTH=true`
- `VITE_SUPABASE_AUTH_REDIRECT_TO=http://localhost:5173/editor`

## 4) Arrenca l'editor

```sh
npm run editor:dev
```

## 5) Verificacio rapida

1. Crea o edita un projecte i desa'l.
2. Refresca la pagina i comprova que torna a sortir.
3. Puja un sprite i un so.
4. Comprova que no hi ha `504` a consola.

## 6) OAuth Google (opcional, per paritat alta)

Si vols validar tambe Google sign-in en local:

```sh
cp supabase/google-auth.env.example supabase/.env.local
```

Omple `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` i `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, i reinicia:

```sh
npm run supabase:stop
npm run supabase:start
```

Callback local de Google Console:

- `http://127.0.0.1:54421/auth/v1/callback`
- `http://localhost:54421/auth/v1/callback`

## 7) Atura serveis quan acabis

```sh
npm run supabase:stop
```
