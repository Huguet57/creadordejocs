import { describe, expect, it } from "vitest"
import { resolveActiveEventMemoryForObject, type ActiveEventByObjectId } from "./object-event-selection.js"

type EventEntry = { id: string }

describe("object event selection integration flow", () => {
  it("remembers event per object when switching back and forth", () => {
    const objectAEvents: EventEntry[] = [{ id: "a-1" }, { id: "a-2" }]
    const objectBEvents: EventEntry[] = [{ id: "b-1" }, { id: "b-2" }]
    let memory: ActiveEventByObjectId = {}

    memory = resolveActiveEventMemoryForObject(memory, "object-a", objectAEvents)
    expect(memory["object-a"]).toBe("a-1")

    memory = { ...memory, "object-a": "a-2" }
    memory = resolveActiveEventMemoryForObject(memory, "object-b", objectBEvents)
    expect(memory["object-b"]).toBe("b-1")

    memory = { ...memory, "object-b": "b-2" }
    memory = resolveActiveEventMemoryForObject(memory, "object-a", objectAEvents)
    expect(memory["object-a"]).toBe("a-2")
    expect(memory["object-b"]).toBe("b-2")
  })

  it("selects newest after add, then falls back when that event is removed", () => {
    let memory: ActiveEventByObjectId = {}
    const objectAEvents: EventEntry[] = [{ id: "a-1" }]

    memory = resolveActiveEventMemoryForObject(memory, "object-a", objectAEvents)
    expect(memory["object-a"]).toBe("a-1")

    const objectAWithNewEvent: EventEntry[] = [...objectAEvents, { id: "a-2" }]
    memory = resolveActiveEventMemoryForObject(memory, "object-a", objectAWithNewEvent, { preferNewest: true })
    expect(memory["object-a"]).toBe("a-2")

    memory = resolveActiveEventMemoryForObject(memory, "object-a", objectAEvents)
    expect(memory["object-a"]).toBe("a-1")
  })
})
