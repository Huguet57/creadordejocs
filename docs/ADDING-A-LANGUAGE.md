# Adding a new language

## Scaffold command

```bash
npm run locale:add -- --code fr --name French
```

Optional flags:

- `--html-lang fr`
- `--og-locale fr_FR`
- `--brand-name "GameCreator"`
- `--dry-run`

## Steps

### 1. Create the translation file

Copy `apps/editor/src/i18n/ca.ts` and translate all keys:

```typescript
// apps/editor/src/i18n/fr.ts
import type { caMessages } from "./ca.js"

export const frMessages: Record<keyof typeof caMessages, string> = {
  appBrandName: "CréateurDeJeux",
  appSaving: "Enregistrement…",
  // ... all keys
} as const
```

TypeScript will error if any key is missing.

### 2. Register locale + SEO config in one place

Update these two central files:

- `apps/editor/src/i18n/locales.ts`
  - Add locale code to `SUPPORTED_LOCALES`
  - Add locale entry to `MESSAGES_BY_LOCALE`
  - Add locale entry to `LOCALE_MANIFEST` (`htmlLang`, `ogLocale`, `brandName`, etc.)

- `apps/editor/src/seo/seo-locales.ts`
  - Add locale entry to `RUNTIME_SEO_BY_LOCALE` (landing/editor/play titles)
  - Add locale entry to `BUILD_SEO_BY_LOCALE` (meta description, OG/Twitter, FAQ, schema)

No other file needs manual locale wiring.

### 3. Verify

```bash
npm run typecheck      # Missing translation keys or wrong locale config fails
npm run test:unit      # Route and SEO smoke tests
npm run editor:build   # Generates locale HTML + sitemap
```

Confirm outputs:

- `apps/editor/dist/index.html`
- `apps/editor/dist/<new-locale>/index.html`
- `apps/editor/dist/sitemap.xml`

If build fails with a locale completeness error, check `assertLocaleConfigComplete()` in `apps/editor/src/seo/seo-locales.ts`.
