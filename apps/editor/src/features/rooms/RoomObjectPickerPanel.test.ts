import { createElement, type ComponentProps } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { RoomObjectPickerPanel } from "./RoomObjectPickerPanel.js"

type PanelProps = ComponentProps<typeof RoomObjectPickerPanel>

function createProps(overrides: Partial<PanelProps> = {}): PanelProps {
  return {
    objects: [
      {
        id: "obj-1",
        name: "Tree",
        spriteId: "spr-root"
      }
    ] as PanelProps["objects"],
    objectFolders: [] as PanelProps["objectFolders"],
    spriteFolders: [
      {
        id: "spr-folder-1",
        name: "Nature",
        parentId: null
      }
    ] as PanelProps["spriteFolders"],
    resolvedSpriteSources: {
      "spr-root": "data:image/png;base64,AA==",
      "spr-leaf": "data:image/png;base64,BB=="
    },
    placingObjectId: null,
    hasActiveRoom: true,
    onTogglePlacement: vi.fn(),
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    roomWidthInput: "640",
    roomHeightInput: "480",
    onRoomWidthInputChange: vi.fn(),
    onRoomHeightInputChange: vi.fn(),
    onCommitRoomSize: vi.fn(),
    backgroundSpriteId: null,
    backgroundSprites: [
      {
        id: "spr-root",
        name: "Ground",
        folderId: null
      },
      {
        id: "spr-leaf",
        name: "Leaf",
        folderId: "spr-folder-1"
      }
    ] as PanelProps["backgroundSprites"],
    onChangeBackgroundSprite: vi.fn(),
    editMode: "objects",
    onEditModeChange: vi.fn(),
    paintTool: "brush",
    onPaintToolChange: vi.fn(),
    paintBrushSpriteId: "spr-root",
    onPaintBrushSpriteChange: vi.fn(),
    paintedStampCount: 2,
    ...overrides
  }
}

describe("RoomObjectPickerPanel", () => {
  it("shows sprite tree and Tools in paint mode without Attributes", () => {
    const markup = renderToStaticMarkup(
      createElement(RoomObjectPickerPanel, createProps({ editMode: "paintBackground" }))
    )

    expect(markup).toContain("Nature")
    expect(markup).toContain("Ground")
    expect(markup).toContain(">Tools<")
    expect(markup).not.toContain(">Attributes<")
    expect(markup).not.toContain("Tree")
  })

  it("shows object list and Attributes in objects mode without Tools", () => {
    const markup = renderToStaticMarkup(
      createElement(RoomObjectPickerPanel, createProps({ editMode: "objects" }))
    )

    expect(markup).toContain("Tree")
    expect(markup).toContain(">Attributes<")
    expect(markup).not.toContain(">Tools<")
  })
})
