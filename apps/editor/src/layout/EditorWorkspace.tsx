import type { EditorController } from "../features/editor-state/use-editor-controller.js"
import { ObjectEditorSection } from "../features/objects/ObjectEditorSection.js"
import { RoomEditorSection } from "../features/rooms/RoomEditorSection.js"
import { RunSection } from "../features/run/RunSection.js"
import { SpriteEditorSection } from "../features/sprites/SpriteEditorSection.js"
import { TemplatesSection } from "../features/templates/TemplatesSection.js"
import { GlobalVariablesSection } from "../features/variables/GlobalVariablesSection.js"

type EditorWorkspaceProps = {
  controller: EditorController
}

export function EditorWorkspace({ controller }: EditorWorkspaceProps) {
  let content: React.ReactNode
  if (controller.activeSection === "sprites") {
    content = <SpriteEditorSection controller={controller} />
  } else if (controller.activeSection === "objects") {
    content = <ObjectEditorSection controller={controller} />
  } else if (controller.activeSection === "rooms") {
    content = <RoomEditorSection controller={controller} />
  } else if (controller.activeSection === "templates") {
    content = <TemplatesSection controller={controller} />
  } else if (controller.activeSection === "globalVariables") {
    content = <GlobalVariablesSection controller={controller} />
  } else {
    content = <RunSection controller={controller} />
  }

  return <div className="mvp15-editor-workspace min-h-0 h-full">{content}</div>
}
