import { createElement, type ComponentProps } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { ActionBlock } from "./ActionBlock.js"

type Props = ComponentProps<typeof ActionBlock>

function createProps(overrides: Partial<Props> = {}): Props {
  return {
    action: {
      id: "action-1",
      type: "goToRoom",
      roomId: "room-2",
      transition: "fade"
    },
    index: 0,
    isFirst: true,
    isLast: true,
    onUpdate: vi.fn(),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    onRemove: vi.fn(),
    onCopy: vi.fn(),
    onPaste: vi.fn(),
    canPaste: false,
    selectableObjects: [],
    selectableSprites: [],
    spriteFolders: [],
    globalVariables: [],
    roomInstances: [],
    rooms: [
      { id: "room-1", name: "Bosc" },
      { id: "room-2", name: "Batalla" }
    ] as Props["rooms"],
    selectedObjectVariables: [],
    eventType: "Step",
    ...overrides
  }
}

describe("ActionBlock goToRoom", () => {
  it("renders custom room and transition selectors", () => {
    const markup = renderToStaticMarkup(createElement(ActionBlock, createProps()))

    expect(markup).toContain("action-block-room-select-trigger")
    expect(markup).toContain("action-block-room-transition-select-trigger")
    expect(markup).toContain("Batalla")
    expect(markup).toContain("Fade")
    expect(markup).not.toContain("<select")
  })

  it("falls back to None transition label when transition is missing", () => {
    const markup = renderToStaticMarkup(
      createElement(
        ActionBlock,
        createProps({
          action: {
            id: "action-2",
            type: "goToRoom",
            roomId: "room-1"
          }
        })
      )
    )

    expect(markup).toContain("None")
  })
})
