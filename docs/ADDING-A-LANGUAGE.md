# Adding a new language

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

### 2. Register the locale

In `apps/editor/src/i18n/locales.ts`, add the code to `SUPPORTED_LOCALES`:

```diff
-export const SUPPORTED_LOCALES = ["ca", "es", "en"] as const
+export const SUPPORTED_LOCALES = ["ca", "es", "en", "fr"] as const
```

### 3. Wire messages into `t()`

In `apps/editor/src/i18n/t.ts`, import and register:

```diff
 import { esMessages } from "./es.js"
 import { enMessages } from "./en.js"
+import { frMessages } from "./fr.js"

 const messagesByLocale: Record<SupportedLocale, Messages> = {
   ca: caMessages,
   es: esMessages,
-  en: enMessages
+  en: enMessages,
+  fr: frMessages
 }
```

### 4. Add SEO meta tags

In `apps/editor/src/App.tsx`, add an entry to `META_BY_LOCALE`:

```typescript
fr: {
  landingTitle: "Créateur de jeux en ligne | Créez un jeu gratuitement",
  editorTitle: "Éditeur de jeux en ligne | CréateurDeJeux",
  playTitle: "Jeu partagé | CréateurDeJeux"
}
```

### 5. Add build-time HTML config

In `apps/editor/scripts/generate-locale-html.ts`, add a new entry to the `locales` array with all SEO fields (title, description, OG tags, FAQ translations, etc.).

### 6. Update Vercel rewrites

In `vercel.json`, add the locale code to the regex:

```diff
-{ "source": "/:locale(es|en)/editor/:path*", ...}
+{ "source": "/:locale(es|en|fr)/editor/:path*", ...}
```

Update all five locale rewrite rules.

## Verification

```bash
npm run typecheck    # Missing keys → compile error
npm run test:unit    # Existing tests still pass
npm run editor:build # Check dist/fr/index.html exists with correct meta tags
```
