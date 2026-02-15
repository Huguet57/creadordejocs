import { describe, expect, it } from "vitest"
import { generateUUID } from "../src/generate-id.js"

describe("generateUUID", () => {
  it("returns a string in UUID v4 format", () => {
    const id = generateUUID()
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
  })

  it("returns unique values on each call", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateUUID()))
    expect(ids.size).toBe(100)
  })

  it("uses fallback when crypto.randomUUID is unavailable", () => {
    const original = crypto.randomUUID.bind(crypto)
    try {
      // @ts-expect-error — intentionally removing for test
      crypto.randomUUID = undefined
      const id = generateUUID()
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      )
    } finally {
      crypto.randomUUID = original
    }
  })
})
