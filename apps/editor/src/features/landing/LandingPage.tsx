import type { MouseEvent } from "react"

type LandingPageProps = {
  onStartEditor: () => void
}

type LandingStep = {
  title: string
  description: string
}

type LandingFeature = {
  title: string
  description: string
}

type LandingFaq = {
  question: string
  answer: string
}

const landingSteps: LandingStep[] = [
  {
    title: "1. Crea la base del teu joc",
    description:
      "Comenca amb una plantilla o un projecte en blanc, afegeix personatges i defineix objectius sense tocar codi."
  },
  {
    title: "2. Ajusta mecaniques i regles",
    description:
      "Mou objectes, afegeix sons i configura events visuals en un flux simple: crear, editar i provar."
  },
  {
    title: "3. Executa i iterar al moment",
    description:
      "Prova el joc directament al navegador, corregeix idees en segons i continua millorant fins que sigui divertit."
  }
]

const landingFeatures: LandingFeature[] = [
  {
    title: "Sense login ni barreres",
    description:
      "La landing et porta directe al creador de jocs: un clic i ja estàs construint el primer nivell."
  },
  {
    title: "Pensat per a principiants",
    description:
      "Si has buscat com crear un joc o web per fer jocs, aqui tens una ruta clara i guiada de principi a fi."
  },
  {
    title: "100% web i rapid",
    description:
      "No has d'instal-lar res. Obres el navegador, crees, proves i ajustes el joc des de qualsevol dispositiu."
  }
]

const landingFaqs: LandingFaq[] = [
  {
    question: "Aquesta eina es un creador de jocs gratis?",
    answer:
      "Si. Pots obrir l'editor ara mateix i crear un joc gratis des del navegador, sense registre obligatori."
  },
  {
    question: "Serveix si busco com crear un joc des de zero?",
    answer:
      "Si. El flux et guia pas a pas: assets, objectes, regles i prova immediata. Es ideal per començar rapid."
  },
  {
    question: "Es una web per fer jocs sense saber programar?",
    answer:
      "Si. Pots crear prototips funcionals amb interficie visual i logica basada en accions i events."
  },
  {
    question: "Tambe serveix per qui cerca 'como crear un juego'?",
    answer:
      "Totalment. El producte esta pensat per fer facil el primer joc tant si arribes en catala com en castella."
  }
]

function handleEditorCtaClick(event: MouseEvent<HTMLAnchorElement>, onStartEditor: () => void): void {
  event.preventDefault()
  onStartEditor()
}

export function LandingPage({ onStartEditor }: LandingPageProps) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/95">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <a className="text-sm font-semibold tracking-wide text-sky-300" href="/">
            CreadorDeJocs
          </a>
          <nav aria-label="Navegacio principal" className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a className="transition hover:text-white" href="#com-funciona">
              Com crear un joc
            </a>
            <a className="transition hover:text-white" href="#beneficis">
              Web per fer jocs
            </a>
            <a className="transition hover:text-white" href="#faq">
              FAQ
            </a>
          </nav>
          <a
            className="rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
            href="/editor"
            onClick={(event) => handleEditorCtaClick(event, onStartEditor)}
          >
            Obrir editor
          </a>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-14 pt-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="space-y-6">
          <p className="inline-flex rounded-full border border-sky-400/50 bg-sky-400/10 px-4 py-1 text-sm font-medium text-sky-200">
            Creador de jocs online gratis
          </p>
          <h1 className="text-4xl font-black leading-tight text-white md:text-5xl">
            Creador de jocs: com crear un joc en minuts des del navegador
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-300">
            Si has buscat <strong>creador de jocs</strong>, <strong>com crear un joc</strong> o <strong>web per fer jocs</strong>,
            ets al lloc correcte. Entra a l&apos;editor i passa de la idea al joc jugable en pocs minuts, sense login i sense
            instal-lacions.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              className="rounded-md bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
              data-testid="landing-primary-cta"
              href="/editor"
              onClick={(event) => handleEditorCtaClick(event, onStartEditor)}
            >
              Comenca gratis sense login
            </a>
            <a
              className="rounded-md border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
              href="#com-funciona"
            >
              Veure passos
            </a>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>Acces directe al producte: obre, crea i juga.</li>
            <li>Ideal per educacio, prototips rapids i primers projectes.</li>
            <li>Flux simple: crear, editar, executar i compartir.</li>
          </ul>
        </div>

        <aside className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/40">
          <h2 className="text-xl font-bold text-white">Per que aquesta landing ranqueja millor</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
            <li>Contingut semantic orientat a intencio de cerca informacional i transaccional.</li>
            <li>Resposta clara a cerques long-tail com "com crear un joc pas a pas".</li>
            <li>CTA principal visible per portar usuaris al producte sense friccio.</li>
          </ul>
        </aside>
      </section>

      <section className="border-y border-slate-800 bg-slate-900/40" id="com-funciona">
        <div className="mx-auto w-full max-w-6xl px-6 py-14">
          <h2 className="text-3xl font-bold text-white">Com crear un joc amb aquesta web en 3 passos</h2>
          <p className="mt-3 max-w-3xl text-slate-300">
            Aquest proces esta pensat per qui vol una web per fer jocs de manera rapida: comences de zero, construeixes
            mecaniques i jugues en el mateix entorn.
          </p>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {landingSteps.map((step) => (
              <li className="rounded-xl border border-slate-800 bg-slate-950/70 p-5" key={step.title}>
                <h3 className="text-lg font-semibold text-sky-200">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-14" id="beneficis">
        <h2 className="text-3xl font-bold text-white">Per qui busca un creador de jocs util de veritat</h2>
        <p className="mt-3 max-w-3xl text-slate-300">
          Aquesta plataforma no et queda en tutorial teoric: et dona una entrada directa a l&apos;editor per validar idees,
          practicar i publicar mes rapid.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {landingFeatures.map((feature) => (
            <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-5" key={feature.title}>
              <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-800 bg-slate-900/40" id="faq">
        <div className="mx-auto w-full max-w-6xl px-6 py-14">
          <h2 className="text-3xl font-bold text-white">Preguntes frequents sobre crear jocs online</h2>
          <div className="mt-8 space-y-4">
            {landingFaqs.map((faq) => (
              <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-5" key={faq.question}>
                <h3 className="text-lg font-semibold text-sky-100">{faq.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="rounded-2xl border border-sky-400/40 bg-sky-400/10 p-8 text-center">
          <h2 className="text-2xl font-bold text-white">Comenca ara: creador de jocs sense login</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-200">
            Passa directament al producte i crea el teu primer joc ara. Sense compte, sense espera i amb iteracio en temps
            real.
          </p>
          <a
            className="mt-6 inline-flex rounded-md bg-sky-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
            href="/editor"
            onClick={(event) => handleEditorCtaClick(event, onStartEditor)}
          >
            Obrir el creador de jocs
          </a>
        </div>
      </section>
    </main>
  )
}
