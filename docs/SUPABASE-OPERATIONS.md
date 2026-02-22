# Supabase Operations Runbook

Aquest runbook defineix el flux operatiu amb canvi minim entre local i remot.

## Fitxers d'entorn

No editem `apps/editor/.env.local` a ma. Sempre fem servir scripts.

- Target local: `apps/editor/.env.local.local`
- Target remot: `apps/editor/.env.local.remote`
- Target actiu: `apps/editor/.env.local`

## Flux diari

### Treballar en local

```sh
npm run supabase:start
npm run supabase:env:refresh:local
npm run env:local
npm run editor:dev
```

### Treballar en remot

```sh
npm run supabase:env:refresh:remote
npm run env:remote
npm run editor:dev
```

### Comprovar target actiu

```sh
npm run env:status
```

## Re-crear projecte remot (destructiu)

Quan un projecte queda unhealthy i no volem conservar dades:

1. Crear projecte nou (dashboard o CLI).
2. Enllacar el repo al nou ref:

```sh
supabase link --project-ref <NEW_PROJECT_REF>
```

3. Aplicar esquema/migracions:

```sh
SUPABASE_DB_PASSWORD='<NEW_DB_PASSWORD>' supabase db push --linked --include-all
```

4. Verificar migracions remotes:

```sh
supabase migration list --linked
```

5. Refrescar env remot:

```sh
npm run supabase:env:refresh:remote
npm run env:remote
```

6. Eliminar projecte vell:

```sh
supabase projects delete <OLD_PROJECT_REF> --yes
```

## Healthchecks minims

### Local

```sh
supabase status
supabase migration list --local
curl -i http://127.0.0.1:54421/rest/v1/
```

### Remot

```sh
supabase migration list --linked
curl -i https://<PROJECT_REF>.supabase.co/rest/v1/
```

Si el remot retorna timeouts o `504`, canvia a local immediatament:

```sh
npm run env:local
```

## Auth parity (local/remot)

Contracte igual als dos targets:

- `VITE_ENABLE_SUPABASE_AUTH=true`
- `VITE_SUPABASE_AUTH_REDIRECT_TO=http://localhost:5173/editor`
- Anonymous + Email habilitat
- Google OAuth habilitable en ambdos entorns (mateix flux, callbacks diferents)

Google callback remot:

- `https://<PROJECT_REF>.supabase.co/auth/v1/callback`

Google callback local:

- `http://127.0.0.1:54421/auth/v1/callback`
- `http://localhost:54421/auth/v1/callback`
