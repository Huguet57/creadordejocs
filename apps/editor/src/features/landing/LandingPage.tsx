import { useState, type MouseEvent } from "react"
import {
  Paintbrush,
  Settings2,
  Play,
  Zap,
  Layers,
  Sparkles,
  ChevronDown,
  Gamepad2,
  type LucideIcon
} from "lucide-react"

type LandingPageProps = {
  onStartEditor: () => void
}

type LandingStep = {
  icon: LucideIcon
  title: string
  description: string
}

type LandingGameType = {
  icon: LucideIcon
  title: string
  description: string
}

type LandingFaq = {
  question: string
  answer: string
}

const landingSteps: LandingStep[] = [
  {
    icon: Paintbrush,
    title: "1. Defineix objectes i escenaris",
    description:
      "Crea els elements del joc — personatges, obstacles, col·leccionables — assigna'ls sprites i col·loca'ls a les sales amb l'editor visual."
  },
  {
    icon: Settings2,
    title: "2. Assigna comportaments",
    description:
      "Connecta events (teclat, col·lisió, temporitzador) amb accions (moure, destruir, canviar sala, sumar punts) sense escriure codi."
  },
  {
    icon: Play,
    title: "3. Prova i itera al moment",
    description:
      "Executa el joc al navegador, detecta què cal canviar i ajusta-ho en segons. El cicle crear-provar és immediat."
  }
]

const landingGameTypes: LandingGameType[] = [
  {
    icon: Zap,
    title: "Acció i arcade",
    description:
      "Dispara, recull objectes o esquiva obstacles amb el teclat. Amb puntuació, vides i velocitat configurable."
  },
  {
    icon: Layers,
    title: "Puzles i exploració",
    description:
      "Sales interconnectades, interruptors, condicions i objectius. Dissenya recorreguts amb lògica i variables."
  },
  {
    icon: Sparkles,
    title: "Prototips i experiments",
    description:
      "Prova mecàniques noves ràpidament: controls amb ratolí, interaccions entre objectes, regles personalitzades."
  }
]

const landingFaqs: LandingFaq[] = [
  {
    question: "CreadorDeJocs és gratuït?",
    answer:
      "Sí. L'editor és completament gratuït i no demana registre. Obres la pàgina i comences a crear directament."
  },
  {
    question: "Necessito saber programar per crear un joc?",
    answer:
      "No. El sistema funciona amb events i accions visuals. Per exemple: «quan col·lisiona amb un enemic → destrueix-lo i suma 10 punts». Sense codi."
  },
  {
    question: "Quins tipus de jocs puc fer?",
    answer:
      "Jocs 2D: arcade, puzles, aventures amb múltiples sales i jocs controlats amb ratolí. Cada sala fa 560×320 píxels amb objectes de 32×32."
  },
  {
    question: "Puc jugar al joc directament al navegador?",
    answer:
      "Sí. El joc s'executa dins el mateix editor. Fas clic a «Executar», el proves, i tornes a editar al moment."
  }
]

function handleEditorCtaClick(event: MouseEvent<HTMLAnchorElement>, onStartEditor: () => void): void {
  event.preventDefault()
  onStartEditor()
}

function EditorScreenshot() {
  return (
    <div className="landing-screenshot-wrapper rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
      <div className="landing-screenshot-titlebar flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
        <div className="flex gap-1.5">
          <span className="landing-screenshot-dot-red block h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="landing-screenshot-dot-yellow block h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="landing-screenshot-dot-green block h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className="text-[11px] text-slate-400">CreadorDeJocs — Editor</span>
      </div>
      <img
        alt="Captura de l'editor de jocs CreadorDeJocs: objectes, events, accions i condicionals"
        className="landing-screenshot-img block w-full"
        height={596}
        loading="eager"
        src="/landing-page.png"
        width={1024}
      />
    </div>
  )
}

function LandingFaqItem({ faq }: { faq: LandingFaq }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="landing-faq-item border-b border-slate-200 last:border-b-0">
      <button
        className="landing-faq-trigger flex w-full items-center justify-between gap-4 py-5 text-left"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <h3 className="text-base font-semibold text-slate-900">{faq.question}</h3>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`landing-faq-content overflow-hidden transition-all duration-200 ${open ? "max-h-40 pb-5" : "max-h-0"}`}
      >
        <p className="text-sm leading-relaxed text-slate-600">{faq.answer}</p>
      </div>
    </div>
  )
}

export function LandingPage({ onStartEditor }: LandingPageProps) {
  return (
    <div className="landing-page min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="landing-header sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3.5">
          <a className="landing-logo flex items-center gap-2 font-semibold tracking-wide text-slate-900" href="/">
            <Gamepad2 className="h-5 w-5 text-sky-500" />
            CreadorDeJocs
          </a>
          <nav
            aria-label="Navegació principal"
            className="landing-nav hidden items-center gap-6 text-sm text-slate-600 md:flex"
          >
            <a className="transition hover:text-slate-900" href="#com-funciona">
              Com funciona
            </a>
            <a className="transition hover:text-slate-900" href="#jocs">
              Tipus de jocs
            </a>
            <a className="transition hover:text-slate-900" href="#faq">
              FAQ
            </a>
          </nav>
          <a
            className="landing-header-cta rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            href="/editor"
            onClick={(event) => handleEditorCtaClick(event, onStartEditor)}
          >
            Obrir editor
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14">
          <div className="landing-hero-text space-y-6">
            <span className="landing-badge inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1 text-sm font-medium text-sky-700">
              <Gamepad2 className="h-3.5 w-3.5" />
              Editor de jocs online — gratuït i al navegador
            </span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Creador de jocs: crea el teu joc des del navegador
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-slate-600">
              Un editor visual on defineixes objectes, els hi assignes comportaments — col·lisions, moviment, puntuació —
              i proves el resultat al moment. Tot al navegador, sense instal·lar res.
            </p>
            <a
              className="landing-cta-primary inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              data-testid="landing-primary-cta"
              href="/editor"
              onClick={(event) => handleEditorCtaClick(event, onStartEditor)}
            >
              Ves a l&apos;editor
            </a>
            <p className="text-sm text-slate-500">
              Tens una idea de joc? Porta-la a la realitat en minuts.
            </p>
          </div>
          <div className="landing-hero-visual hidden lg:block">
            <EditorScreenshot />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-steps-section border-y border-slate-100 bg-white" id="com-funciona">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-900">
            Com crear un joc en tres passos
          </h2>
          <ol className="landing-steps-grid mt-10 grid gap-5 md:grid-cols-3">
            {landingSteps.map((step) => {
              const StepIcon = step.icon
              return (
                <li
                  className="landing-step-card rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                  key={step.title}
                >
                  <div className="landing-step-icon flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* Game Types */}
      <section className="landing-gametypes-section bg-slate-50" id="jocs">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="landing-gametypes-header max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Quins tipus de jocs pots crear</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              L&apos;editor inclou plantilles per començar ràpid amb diferents estils de joc.
            </p>
          </div>
          <div className="landing-gametypes-grid mt-10 grid gap-5 md:grid-cols-3">
            {landingGameTypes.map((gameType) => {
              const GameTypeIcon = gameType.icon
              return (
                <article
                  className="landing-gametype-card rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                  key={gameType.title}
                >
                  <div className="landing-gametype-icon flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                    <GameTypeIcon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{gameType.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{gameType.description}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="landing-faq-section bg-white" id="faq">
        <div className="mx-auto w-full max-w-3xl px-6 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">Preguntes freqüents</h2>
          <div className="landing-faq-list mt-10 rounded-xl border border-slate-200 bg-white px-6 shadow-sm">
            {landingFaqs.map((faq) => (
              <LandingFaqItem faq={faq} key={faq.question} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="landing-final-cta-section bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="landing-final-cta-card rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Crea el teu primer joc ara</h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-600">
              Obre l&apos;editor i comença amb una plantilla o un projecte en blanc. Sense compte ni instal·lació.
            </p>
            <a
              className="landing-final-cta-button mt-7 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              href="/editor"
              onClick={(event) => handleEditorCtaClick(event, onStartEditor)}
            >
              Obrir l&apos;editor
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer border-t border-slate-200 bg-slate-900">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-10 md:flex-row md:justify-between">
          <div className="landing-footer-brand flex flex-col items-center gap-1 md:items-start">
            <a className="flex items-center gap-2 font-semibold text-white" href="/">
              <Gamepad2 className="h-4 w-4 text-sky-400" />
              CreadorDeJocs
            </a>
            <p className="text-xs text-slate-400">Editor de jocs online — gratuït i sense registre.</p>
          </div>
          <nav
            aria-label="Navegació al peu"
            className="landing-footer-nav flex items-center gap-6 text-sm text-slate-400"
          >
            <a className="transition hover:text-white" href="#com-funciona">
              Com funciona
            </a>
            <a className="transition hover:text-white" href="#jocs">
              Tipus de jocs
            </a>
            <a className="transition hover:text-white" href="#faq">
              FAQ
            </a>
            <a
              className="transition hover:text-white"
              href="/editor"
              onClick={(event) => handleEditorCtaClick(event, onStartEditor)}
            >
              Editor
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
