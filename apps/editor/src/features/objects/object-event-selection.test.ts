import { describe, expect, it } from "vitest"
import { resolveActiveEventIdForObject } from "./object-event-selection.js"

type EventEntry = { id: string }

describe("resolveActiveEventIdForObject", () => {
  const events: EventEntry[] = [{ id: "event-1" }, { id: "event-2" }, { id: "event-3" }]

  it("returns remembered event when still present", () => {
    expect(resolveActiveEventIdForObject(events, "event-2")).toBe("event-2")
  })

  it("falls back to first event when remembered event is missing", () => {
    expect(resolveActiveEventIdForObject(events, "missing-event")).toBe("event-1")
  })

  it("falls back to first event when remembered event is null", () => {
    expect(resolveActiveEventIdForObject(events, null)).toBe("event-1")
  })

  it("returns newest event when preferNewest is true", () => {
    expect(resolveActiveEventIdForObject(events, "event-1", { preferNewest: true })).toBe("event-3")
  })

  it("returns null when object has no events", () => {
    expect(resolveActiveEventIdForObject([], "event-1")).toBeNull()
    expect(resolveActiveEventIdForObject([], null, { preferNewest: true })).toBeNull()
  })
})
