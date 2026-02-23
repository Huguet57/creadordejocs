import {
  DEFAULT_LOCALE,
  LOCALE_MANIFEST,
  SUPPORTED_LOCALES,
  type SupportedLocale
} from "../i18n/locales.js"
import type { BuildSeoMeta, RuntimeSeoMeta, SeoConfigByLocale } from "./seo-types.js"

export const SITE_ORIGIN = "https://creadordejocs.com"
export const X_DEFAULT_LOCALE: SupportedLocale = "en"

export const RUNTIME_SEO_BY_LOCALE: Record<SupportedLocale, RuntimeSeoMeta> = {
  ca: {
    landingTitle: "Creador de jocs online | Com crear un joc gratis | CreadorDeJocs",
    editorTitle: "Editor de jocs online | CreadorDeJocs",
    playTitle: "Joc compartit | CreadorDeJocs"
  },
  es: {
    landingTitle: "Creador de videojuegos online | Cómo crear un juego gratis | CreadorDeJocs",
    editorTitle: "Editor de videojuegos online | CreadorDeJocs",
    playTitle: "Juego compartido | CreadorDeJocs"
  },
  en: {
    landingTitle: "Online Game Creator | Create a Game for Free | GameCreator",
    editorTitle: "Online Game Editor | GameCreator",
    playTitle: "Shared Game | GameCreator"
  }
}

export const BUILD_SEO_BY_LOCALE: Record<SupportedLocale, BuildSeoMeta> = {
  ca: {
    title: "Creador de jocs online | Com crear un joc gratis | CreadorDeJocs",
    description:
      "Creador de jocs online i gratuït. Defineix objectes, comportaments i regles amb un editor visual al navegador. Prova el joc al moment sense instal·lar res.",
    keywords: "creador de jocs, com crear un joc, web per fer jocs, crear joc online",
    ogTitle: "Creador de jocs online: crea el teu joc en minuts",
    ogDescription:
      "Web per fer jocs amb acces directe a l'editor: sense login, sense instal-lacions i amb prova immediata.",
    twitterTitle: "Creador de jocs online | CreadorDeJocs",
    twitterDescription: "Com crear un joc rapid i gratis: obre l'editor i comenca sense login.",
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
  es: {
    title: "Creador de videojuegos online | Cómo crear un juego gratis | CreadorDeJocs",
    description:
      "Creador de videojuegos online y gratuito. Define objetos, comportamientos y reglas con un editor visual en el navegador. Prueba el juego al instante sin instalar nada.",
    keywords:
      "creador de videojuegos, como crear un juego, web para hacer juegos, crear juego online, creador de juegos gratis",
    ogTitle: "Creador de videojuegos online: crea tu juego en minutos",
    ogDescription:
      "Web para hacer juegos con acceso directo al editor: sin login, sin instalaciones y con prueba inmediata.",
    twitterTitle: "Creador de videojuegos online | CreadorDeJocs",
    twitterDescription: "Cómo crear un juego rápido y gratis: abre el editor y empieza sin login.",
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
  en: {
    title: "Online Game Creator | Create a Game for Free | GameCreator",
    description:
      "Free online game creator. Define objects, behaviors and rules with a visual editor in the browser. Test your game instantly without installing anything.",
    keywords:
      "game creator, how to make a game, online game maker, free game creator, create a game online",
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
}

export const SEO_BY_LOCALE: SeoConfigByLocale = {
  ca: { runtime: RUNTIME_SEO_BY_LOCALE.ca, build: BUILD_SEO_BY_LOCALE.ca },
  es: { runtime: RUNTIME_SEO_BY_LOCALE.es, build: BUILD_SEO_BY_LOCALE.es },
  en: { runtime: RUNTIME_SEO_BY_LOCALE.en, build: BUILD_SEO_BY_LOCALE.en }
}

export function assertLocaleConfigComplete(): void {
  const defaultLocaleMatchesManifest = LOCALE_MANIFEST[DEFAULT_LOCALE].isDefault
  if (!defaultLocaleMatchesManifest) {
    throw new Error(`Default locale '${DEFAULT_LOCALE}' must have isDefault=true in LOCALE_MANIFEST.`)
  }

  for (const locale of SUPPORTED_LOCALES) {
    if (!LOCALE_MANIFEST[locale]) {
      throw new Error(`Missing locale manifest entry for '${locale}'.`)
    }
    const runtimeSeo = RUNTIME_SEO_BY_LOCALE[locale]
    if (!runtimeSeo?.landingTitle || !runtimeSeo.editorTitle || !runtimeSeo.playTitle) {
      throw new Error(`Missing runtime SEO titles for locale '${locale}'.`)
    }
    const buildSeo = BUILD_SEO_BY_LOCALE[locale]
    if (!buildSeo?.title || !buildSeo.description || !buildSeo.keywords || !buildSeo.schemaDescription) {
      throw new Error(`Missing build SEO metadata for locale '${locale}'.`)
    }
    if (!buildSeo.faq.length) {
      throw new Error(`Locale '${locale}' must include at least one FAQ item.`)
    }
  }
}
