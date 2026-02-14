import type { EditorController } from "../features/editor-state/use-editor-controller.js"
import { ObjectEditorSection } from "../features/objects/ObjectEditorSection.js"
import { RoomEditorSection } from "../features/rooms/RoomEditorSection.js"
import { RunSection } from "../features/run/RunSection.js"
import { SoundEditorSection } from "../features/sounds/SoundEditorSection.js"
import { SpriteEditorSection } from "../features/sprites/SpriteEditorSection.js"
import { TemplatesSection } from "../features/templates/TemplatesSection.js"

type EditorWorkspaceProps = {
  controller: EditorController
}

export function EditorWorkspace({ controller }: EditorWorkspaceProps) {
  if (controller.activeSection === "sprites") {
    return <SpriteEditorSection controller={controller} />
  }
  if (controller.activeSection === "sounds") {
    return <SoundEditorSection controller={controller} />
  }
  if (controller.activeSection === "objects") {
    return <ObjectEditorSection controller={controller} />
  }
  if (controller.activeSection === "rooms") {
    return <RoomEditorSection controller={controller} />
  }
  if (controller.activeSection === "templates") {
    return <TemplatesSection controller={controller} />
  }
  return <RunSection controller={controller} />
}
