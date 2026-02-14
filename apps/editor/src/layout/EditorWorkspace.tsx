import type { EditorController } from "../features/editor-state/use-editor-controller.js"
import { Button } from "../components/ui/button.js"
import { ObjectEditorSection } from "../features/objects/ObjectEditorSection.js"
import { RoomEditorSection } from "../features/rooms/RoomEditorSection.js"
import { RunSection } from "../features/run/RunSection.js"
import { SoundEditorSection } from "../features/sounds/SoundEditorSection.js"
import { SpriteEditorSection } from "../features/sprites/SpriteEditorSection.js"

type EditorWorkspaceProps = {
  controller: EditorController
}

export function EditorWorkspace({ controller }: EditorWorkspaceProps) {
  const sectionGuides: Record<
    "sprites" | "sounds" | "objects" | "rooms" | "run",
    { hint: string; nextLabel: string; nextSection: "sprites" | "sounds" | "objects" | "rooms" | "run" }
  > = {
    sprites: {
      hint: "Afegeix un sprite base del jugador o enemic.",
      nextLabel: "Continuar a Sounds",
      nextSection: "sounds"
    },
    sounds: {
      hint: "Defineix almenys un so d'impacte o bonus.",
      nextLabel: "Continuar a Objects",
      nextSection: "objects"
    },
    objects: {
      hint: "Configura listeners i actions guiades per donar comportament.",
      nextLabel: "Continuar a Rooms",
      nextSection: "rooms"
    },
    rooms: {
      hint: "Col·loca instàncies del player i enemics dins la sala activa.",
      nextLabel: "Continuar a Run",
      nextSection: "run"
    },
    run: {
      hint: "Prova el loop: esquivar enemics i validar score/game over.",
      nextLabel: "Tornar a Objects",
      nextSection: "objects"
    }
  }
  const guide = sectionGuides[controller.activeSection]

  return (
    <section className="mvp2-workspace-shell space-y-3">
      <div className="mvp2-context-hint rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
        <p>{guide.hint}</p>
        <Button
          variant="outline"
          className="mvp2-context-cta mt-1 h-auto p-0 text-xs"
          onClick={() => controller.setActiveSection(guide.nextSection)}
        >
          {guide.nextLabel}
        </Button>
      </div>
      {controller.activeSection === "sprites" && <SpriteEditorSection controller={controller} />}
      {controller.activeSection === "sounds" && <SoundEditorSection controller={controller} />}
      {controller.activeSection === "objects" && <ObjectEditorSection controller={controller} />}
      {controller.activeSection === "rooms" && <RoomEditorSection controller={controller} />}
      {controller.activeSection === "run" && <RunSection controller={controller} />}
    </section>
  )
}
