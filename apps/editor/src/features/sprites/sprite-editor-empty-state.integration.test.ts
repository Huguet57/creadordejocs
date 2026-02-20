import { describe, expect, it, vi } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { quickCreateSprite, createEmptyProjectV1, type ProjectV1 } from "@creadordejocs/project-format"
import { SpriteEditorSection } from "./SpriteEditorSection.js"
import type { EditorController } from "../editor-state/use-editor-controller.js"

function createControllerStub(project: ProjectV1, activeSpriteId: string | null): EditorController {
  const noop = () => undefined
  const falseResult = () => false
  const nullResult = () => null

  return {
    project,
    activeSection: "sprites",
    setActiveSection: noop,
    activeRoomId: project.rooms[0]?.id ?? "room-1",
    setActiveRoomId: noop,
    activeObjectId: null,
    setActiveObjectId: noop,
    activeSpriteId,
    setActiveSpriteId: noop,
    activeRoom: null,
    selectedObject: null,
    isRunning: false,
    snapshots: [],
    saveStatus: "saved",
    importStatus: "idle",
    runtimeState: {
      score: 0,
      gameOver: false,
      globalVariables: {},
      objectVariablesByObjectId: {},
      playedSoundIds: [],
      restartRoomRequested: false
    },
    undoAvailable: false,
    redoAvailable: false,
    addSprite: nullResult,
    createSpriteFolder: nullResult,
    renameSpriteFolder: falseResult,
    deleteSpriteFolder: falseResult,
    createObjectFolder: nullResult,
    renameObjectFolder: falseResult,
    moveObjectFolder: falseResult,
    moveObjectToFolder: falseResult,
    deleteObjectFolder: falseResult,
    renameSprite: falseResult,
    moveSpriteToFolder: falseResult,
    moveSpriteFolder: falseResult,
    deleteSprite: falseResult,
    createSpriteForSelectedObject: nullResult,
    addSound: noop,
    addObject: noop,
    addGlobalVariable: noop,
    updateGlobalVariable: noop,
    removeGlobalVariable: noop,
    addObjectVariable: noop,
    updateObjectVariable: noop,
    removeObjectVariable: noop,
    addRoom: noop,
    updateSpriteSource: noop,
    updateSpritePixels: noop,
    assignSelectedObjectSprite: falseResult,
    openSpriteEditor: noop,
    updateSoundSource: noop,
    addObjectEvent: noop,
    updateObjectEventConfig: noop,
    removeObjectEvent: noop,
    addObjectEventAction: noop,
    updateObjectEventAction: noop,
    removeObjectEventAction: noop,
    moveObjectEventAction: noop,
    moveObjectEventItem: noop,
    insertObjectEventItem: noop,
    addObjectEventIfBlock: noop,
    updateObjectEventIfBlockCondition: noop,
    removeObjectEventIfBlock: noop,
    addObjectEventIfAction: noop,
    updateObjectEventIfAction: noop,
    removeObjectEventIfAction: noop,
    addObjectEventBlock: noop,
    removeObjectEventBlock: noop,
    updateObjectEventBlock: noop,
    addBlockAction: noop,
    updateBlockAction: noop,
    removeBlockAction: noop,
    updateSelectedObjectProperty: noop,
    addInstanceToActiveRoom: noop,
    moveInstance: noop,
    removeInstance: noop,
    updateRuntimeMousePosition: noop,
    setRuntimeMouseButton: noop,
    run: noop,
    reset: noop,
    deleteSelectedObject: noop,
    deleteObjectById: falseResult,
    saveNow: noop,
    loadTemplate: noop,
    loadSavedProject: noop,
    importProjectFromJsonFile: vi.fn(() => Promise.resolve(false)),
    resetImportStatus: noop,
    restoreSnapshot: noop,
    undo: noop,
    redo: noop
  } as unknown as EditorController
}

describe("Sprite editor empty-state integration", () => {
  it("renders an empty editor state without tools when no sprite tab is active", () => {
    const baseProject = createEmptyProjectV1("sprite-empty-state")
    const spriteProject = quickCreateSprite(baseProject, "Laser Beam").project
    const controller = createControllerStub(spriteProject, null)

    const markup = renderToStaticMarkup(createElement(SpriteEditorSection, { controller }))

    expect(markup).toContain("Select a sprite to start editing")
    expect(markup).not.toContain(">Tools<")
    expect(markup).not.toContain(">Grid<")
  })

  it("renders sprite editing chrome when there is an active sprite tab", () => {
    const baseProject = createEmptyProjectV1("sprite-active-state")
    const spriteResult = quickCreateSprite(baseProject, "Laser Beam")
    const controller = createControllerStub(spriteResult.project, spriteResult.spriteId)

    const markup = renderToStaticMarkup(createElement(SpriteEditorSection, { controller }))

    expect(markup).toContain(">Tools<")
    expect(markup).toContain(">Grid<")
    expect(markup).not.toContain("Select a sprite to start editing")
  })
})
