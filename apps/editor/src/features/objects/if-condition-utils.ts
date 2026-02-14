import type { VariableType } from "@creadordejocs/project-format"
import type { IfCondition } from "../editor-state/types.js"

type VariableOption = {
  id: string
  initialValue: string | number | boolean
}

export function buildDefaultIfCondition(
  globalVariables: VariableOption[],
  objectVariables: VariableOption[]
): IfCondition | null {
  const firstGlobal = globalVariables[0]
  if (firstGlobal) {
    return {
      left: { scope: "global", variableId: firstGlobal.id },
      operator: "==",
      right: firstGlobal.initialValue
    }
  }
  const firstObject = objectVariables[0]
  if (firstObject) {
    return {
      left: { scope: "object", variableId: firstObject.id },
      operator: "==",
      right: firstObject.initialValue
    }
  }
  return null
}

export function coerceIfConditionRightValue(type: VariableType, rawValue: string): string | number | boolean {
  if (type === "number") {
    const parsed = Number(rawValue)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (type === "boolean") {
    return rawValue === "true"
  }
  return rawValue
}
