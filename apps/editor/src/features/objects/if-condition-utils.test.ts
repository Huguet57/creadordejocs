import { describe, expect, it } from "vitest"
import { buildDefaultIfCondition, coerceIfConditionRightValue } from "./if-condition-utils.js"

describe("if condition utils", () => {
  it("builds default condition from global variable first", () => {
    const condition = buildDefaultIfCondition(
      [{ id: "gv-score", initialValue: 0 }],
      [{ id: "ov-health", initialValue: 3 }]
    )

    expect(condition).toEqual({
      left: { scope: "global", variableId: "gv-score" },
      operator: "==",
      right: 0
    })
  })

  it("falls back to object variable when no global variable exists", () => {
    const condition = buildDefaultIfCondition([], [{ id: "ov-health", initialValue: 3 }])

    expect(condition).toEqual({
      left: { scope: "object", variableId: "ov-health" },
      operator: "==",
      right: 3
    })
  })

  it("coerces right-side values by variable type", () => {
    expect(coerceIfConditionRightValue("number", "42")).toBe(42)
    expect(coerceIfConditionRightValue("number", "not-a-number")).toBe(0)
    expect(coerceIfConditionRightValue("boolean", "true")).toBe(true)
    expect(coerceIfConditionRightValue("boolean", "false")).toBe(false)
    expect(coerceIfConditionRightValue("string", "hola")).toBe("hola")
  })
})
