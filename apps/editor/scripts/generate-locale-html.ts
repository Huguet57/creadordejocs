/**
 * Post-build script: generates locale-specific index.html variants and sitemap.
 *
 * Run after `vite build`:
 *   npx tsx apps/editor/scripts/generate-locale-html.ts
 *
 * Reads dist/index.html (Catalan default) and creates:
 *   dist/es/index.html  — Spanish meta tags
 *   dist/en/index.html  — English meta tags
 *   dist/sitemap.xml    — multi-language sitemap with hreflang alternates
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, "../dist")

const SITE_ORIGIN = "https://creadordejocs.com"

type LocaleConfig = {
  code: string
  htmlLang: string
  ogLocale: string
  title: string
  description: string
  ogTitle: string
  ogDescription: string
  twitterTitle: string
  twitterDescription: string
  schemaDescription: string
  faq: { q: string; a: string }[]
}

const locales: LocaleConfig[] = [
  {
    code: "ca",
    htmlLang: "ca",
    ogLocale: "ca_ES",
    title: "Creador de jocs online | Com crear un joc gratis | CreadorDeJocs",
    description:
      "Creador de jocs online i gratuït. Defineix objectes, comportaments i regles amb un editor visual al navegador. Prova el joc al moment sense instal·lar res.",
    ogTitle: "Creador de jocs online: crea el teu joc en minuts",
    ogDescription:
      "Web per fer jocs amb acces directe a l'editor: sense login, sense instal-lacions i amb prova immediata.",
    twitterTitle: "Creador de jocs online | CreadorDeJocs",
    twitterDescription:
      "Com crear un joc rapid i gratis: obre l'editor i comenca sense login.",
    schemaDescription:
      "Creador de jocs online per crear i provar videojocs al navegador sense login.",
    faq: [
      {
        q: "CreadorDeJocs és gratuït?",
        a: "Sí. L'editor és completament gratuït i no demana registre. Obres la pàgina i comences a crear directament."
      },
      {
        q: "Necessito saber programar per crear un joc?",
        a: "No. El sistema funciona amb events i accions visuals. Per exemple: «quan col·lisiona amb un enemic → destrueix-lo i suma 10 punts». Sense codi."
      },
      {
        q: "Quins tipus de jocs puc fer?",
        a: "Jocs 2D: arcade, puzles, aventures amb múltiples sales i jocs controlats amb ratolí. Cada sala fa 560×320 píxels amb objectes de 32×32."
      },
      {
        q: "Puc jugar al joc directament al navegador?",
        a: "Sí. El joc s'executa dins el mateix editor. Fas clic a «Executar», el proves, i tornes a editar al moment."
      }
    ]
  },
  {
    code: "es",
    htmlLang: "es",
    ogLocale: "es_ES",
    title:
      "Creador de videojuegos online | Cómo crear un juego gratis | CreadorDeJocs",
    description:
      "Creador de videojuegos online y gratuito. Define objetos, comportamientos y reglas con un editor visual en el navegador. Prueba el juego al instante sin instalar nada.",
    ogTitle: "Creador de videojuegos online: crea tu juego en minutos",
    ogDescription:
      "Web para hacer juegos con acceso directo al editor: sin login, sin instalaciones y con prueba inmediata.",
    twitterTitle: "Creador de videojuegos online | CreadorDeJocs",
    twitterDescription:
      "Cómo crear un juego rápido y gratis: abre el editor y empieza sin login.",
    schemaDescription:
      "Creador de videojuegos online para crear y probar juegos en el navegador sin login.",
    faq: [
      {
        q: "¿CreadorDeJocs es gratuito?",
        a: "Sí. El editor es completamente gratuito y no pide registro. Abres la página y empiezas a crear directamente."
      },
      {
        q: "¿Necesito saber programar para crear un juego?",
        a: "No. El sistema funciona con eventos y acciones visuales. Por ejemplo: «cuando colisiona con un enemigo → destrúyelo y suma 10 puntos». Sin código."
      },
      {
        q: "¿Qué tipos de juegos puedo hacer?",
        a: "Juegos 2D: arcade, puzles, aventuras con múltiples salas y juegos controlados con ratón. Cada sala mide 560×320 píxeles con objetos de 32×32."
      },
      {
        q: "¿Puedo jugar al juego directamente en el navegador?",
        a: "Sí. El juego se ejecuta dentro del mismo editor. Haces clic en «Ejecutar», lo pruebas, y vuelves a editar al instante."
      }
    ]
  },
  {
    code: "en",
    htmlLang: "en",
    ogLocale: "en_US",
    title: "Online Game Creator | Create a Game for Free | GameCreator",
    description:
      "Free online game creator. Define objects, behaviors and rules with a visual editor in the browser. Test your game instantly without installing anything.",
    ogTitle: "Online Game Creator: build your game in minutes",
    ogDescription:
      "A website to make games with direct editor access: no login, no installations, instant testing.",
    twitterTitle: "Online Game Creator | GameCreator",
    twitterDescription:
      "How to create a game quickly and for free: open the editor and start without login.",
    schemaDescription:
      "Online game creator to build and test video games in the browser without login.",
    faq: [
      {
        q: "Is GameCreator free?",
        a: "Yes. The editor is completely free and requires no sign-up. Just open the page and start creating."
      },
      {
        q: "Do I need to know how to code to create a game?",
        a: "No. The system works with visual events and actions. For example: «when it collides with an enemy → destroy it and add 10 points». No code needed."
      },
      {
        q: "What types of games can I make?",
        a: "2D games: arcade, puzzles, adventures with multiple rooms and mouse-controlled games. Each room is 560×320 pixels with 32×32 objects."
      },
      {
        q: "Can I play the game directly in the browser?",
        a: "Yes. The game runs inside the editor itself. Click «Run», test it, and go back to editing instantly."
      }
    ]
  }
]

function localeUrl(localeCode: string, path = "/"): string {
  if (localeCode === "ca") return `${SITE_ORIGIN}${path}`
  const suffix = path === "/" ? "" : path
  return `${SITE_ORIGIN}/${localeCode}${suffix}`
}

function buildHreflangLinks(routePath: string): string {
  const links = locales.map(
    (loc) =>
      `    <link rel="alternate" hreflang="${loc.code}" href="${localeUrl(loc.code, routePath)}" />`
  )
  links.push(
    `    <link rel="alternate" hreflang="x-default" href="${localeUrl("en", routePath)}" />`
  )
  return links.join("\n")
}

function buildFaqSchema(faq: { q: string; a: string }[]): string {
  const entities = faq.map(
    (item) => `          {
            "@type": "Question",
            "name": ${JSON.stringify(item.q)},
            "acceptedAnswer": {
              "@type": "Answer",
              "text": ${JSON.stringify(item.a)}
            }
          }`
  )
  return `    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
${entities.join(",\n")}
        ]
      }
    </script>`
}

function buildAppSchema(loc: LocaleConfig): string {
  return `    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "CreadorDeJocs",
        "applicationCategory": "GameApplication",
        "operatingSystem": "Web",
        "url": "${localeUrl(loc.code)}",
        "description": ${JSON.stringify(loc.schemaDescription)},
        "inLanguage": ${JSON.stringify(locales.map((l) => l.code))},
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "EUR"
        }
      }
    </script>`
}

function transformHtml(baseHtml: string, loc: LocaleConfig): string {
  let html = baseHtml

  // <html lang="...">
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${loc.htmlLang}"`)

  // <title>
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${loc.title}</title>`)

  // <meta name="description">
  html = html.replace(
    /(<meta\s+name="description"\s+content=")[^"]*(")/,
    `$1${loc.description}$2`
  )

  // <meta name="keywords"> — replace with locale-appropriate keywords
  const keywordsByLocale: Record<string, string> = {
    ca: "creador de jocs, com crear un joc, web per fer jocs, crear joc online",
    es: "creador de videojuegos, como crear un juego, web para hacer juegos, crear juego online, creador de juegos gratis",
    en: "game creator, how to make a game, online game maker, free game creator, create a game online"
  }
  html = html.replace(
    /(<meta\s+name="keywords"\s+content=")[^"]*(")/,
    `$1${keywordsByLocale[loc.code] ?? ""}$2`
  )

  // Canonical URL
  html = html.replace(
    /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
    `$1${localeUrl(loc.code)}$2`
  )

  // OG tags
  html = html.replace(
    /(<meta\s+property="og:locale"\s+content=")[^"]*(")/,
    `$1${loc.ogLocale}$2`
  )
  html = html.replace(
    /(<meta\s+property="og:url"\s+content=")[^"]*(")/,
    `$1${localeUrl(loc.code)}$2`
  )
  html = html.replace(
    /(<meta\s+property="og:title"\s+content=")[^"]*(")/,
    `$1${loc.ogTitle}$2`
  )
  html = html.replace(
    /(<meta\s+property="og:description"\s+content=")[^"]*(")/s,
    `$1${loc.ogDescription}$2`
  )

  // Twitter Card tags
  html = html.replace(
    /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,
    `$1${loc.twitterTitle}$2`
  )
  html = html.replace(
    /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/s,
    `$1${loc.twitterDescription}$2`
  )

  // Replace JSON-LD schemas
  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `${buildAppSchema(loc)}\n${buildFaqSchema(loc.faq)}`
  )

  // Insert hreflang links before </head>
  const hreflangLinks = buildHreflangLinks("/")
  html = html.replace("</head>", `${hreflangLinks}\n  </head>`)

  return html
}

function buildSitemap(): string {
  const indexableRoutes = ["/"]

  let urls = ""
  for (const route of indexableRoutes) {
    for (const loc of locales) {
      const alternates = locales
        .map(
          (alt) =>
            `      <xhtml:link rel="alternate" hreflang="${alt.code}" href="${localeUrl(alt.code, route)}" />`
        )
        .join("\n")
      const xDefault = `      <xhtml:link rel="alternate" hreflang="x-default" href="${localeUrl("en", route)}" />`

      urls += `  <url>
    <loc>${localeUrl(loc.code, route)}</loc>
${alternates}
${xDefault}
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>\n`
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}</urlset>
`
}

// ── Main ────────────────────────────────────────────────────────

const baseHtml = readFileSync(resolve(distDir, "index.html"), "utf-8")

// Generate locale variants
for (const loc of locales) {
  const html = transformHtml(baseHtml, loc)

  if (loc.code === "ca") {
    // Overwrite the default index.html with hreflang + updated schema
    writeFileSync(resolve(distDir, "index.html"), html, "utf-8")
    console.log("  updated dist/index.html (ca)")
  } else {
    const locDir = resolve(distDir, loc.code)
    mkdirSync(locDir, { recursive: true })
    writeFileSync(resolve(locDir, "index.html"), html, "utf-8")
    console.log(`  created dist/${loc.code}/index.html`)
  }
}

// Generate sitemap
const sitemap = buildSitemap()
writeFileSync(resolve(distDir, "sitemap.xml"), sitemap, "utf-8")
console.log("  generated dist/sitemap.xml")

console.log("Locale HTML generation complete.")
