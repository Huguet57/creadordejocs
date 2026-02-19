import type { ProjectV1, ValueExpressionOutput } from "@creadordejocs/project-format"

export type ScalarType = "number" | "string" | "boolean"
export type CollectionType = "list" | "map"
export type IfOperator = "==" | "!=" | ">" | ">=" | "<" | "<="
export type ValueTarget = "self" | "other" | "instanceId"

type VariableDefinition = ProjectV1["variables"]["global"][number]
type ScalarVariableDefinition = Extract<VariableDefinition, { type: ScalarType }>
type CollectionVariableDefinition = Extract<VariableDefinition, { type: CollectionType }>
type LegacyVariableReference = { scope: "global" | "object"; variableId: string }
type ValueSourceExpression = Extract<ValueExpressionOutput, { source: string }>

type CollectionActionType = CollectionActionDraft["type"]

export type IterationVariableDefinition = {
  name: string
  type: ScalarType
}

export type VariableSelectionContext = {
  globalVariables: ProjectV1["variables"]["global"]
  selfObjectVariables: ProjectV1["variables"]["global"]
  otherObjectVariables?: ProjectV1["variables"]["global"]
  allowOtherTarget?: boolean
  allowInstanceTarget?: boolean
  iterationVariables?: IterationVariableDefinition[]
}

export type VariableUniverseContext = {
  globalVariables: ProjectV1["variables"]["global"]
  selfObjectVariables: ProjectV1["variables"]["global"]
  otherObjectVariableSets?: ProjectV1["variables"]["global"][]
  allowOtherTarget?: boolean
}

export type VariableUniverse = {
  globalVariables: ProjectV1["variables"]["global"]
  selfObjectVariables: ProjectV1["variables"]["global"]
  otherObjectVariables: ProjectV1["variables"]["global"]
  otherObjectVariablesUnion: ProjectV1["variables"]["global"]
  otherObjectVariablesIntersection: ProjectV1["variables"]["global"]
  allowOtherTarget: boolean
}

export type IfConditionDraft = {
  left: ValueExpressionOutput
  operator: IfOperator
  right: ValueExpressionOutput
}

export type ChangeVariableDraft = {
  type: "changeVariable"
  scope: "global" | "object"
  variableId: string
  operator: "set" | "add" | "subtract" | "multiply"
  value: ValueExpressionOutput
  target?: ValueTarget | null | undefined
  targetInstanceId?: string | null | undefined
}

export type CollectionActionDraft =
  | {
      type: "listPush"
      scope: "global" | "object"
      variableId: string
      value: ValueExpressionOutput
      target?: ValueTarget | null | undefined
      targetInstanceId?: string | null | undefined
    }
  | {
      type: "listSetAt"
      scope: "global" | "object"
      variableId: string
      index: ValueExpressionOutput
      value: ValueExpressionOutput
      target?: ValueTarget | null | undefined
      targetInstanceId?: string | null | undefined
    }
  | {
      type: "listRemoveAt"
      scope: "global" | "object"
      variableId: string
      index: ValueExpressionOutput
      target?: ValueTarget | null | undefined
      targetInstanceId?: string | null | undefined
    }
  | {
      type: "listClear"
      scope: "global" | "object"
      variableId: string
      target?: ValueTarget | null | undefined
      targetInstanceId?: string | null | undefined
    }
  | {
      type: "mapSet"
      scope: "global" | "object"
      variableId: string
      key: ValueExpressionOutput
      value: ValueExpressionOutput
      target?: ValueTarget | null | undefined
      targetInstanceId?: string | null | undefined
    }
  | {
      type: "mapDelete"
      scope: "global" | "object"
      variableId: string
      key: ValueExpressionOutput
      target?: ValueTarget | null | undefined
      targetInstanceId?: string | null | undefined
    }
  | {
      type: "mapClear"
      scope: "global" | "object"
      variableId: string
      target?: ValueTarget | null | undefined
      targetInstanceId?: string | null | undefined
    }

export type EmitPayloadDraft = {
  type: "emitCustomEvent"
  payload: ValueExpressionOutput
}

export type CopyVariableDraft = {
  type: "copyVariable"
  direction: "globalToObject" | "objectToGlobal"
  globalVariableId: string
  objectVariableId: string
  instanceTarget: ValueTarget
  instanceTargetId: string | null
}

export const ALL_IF_OPERATORS: readonly IfOperator[] = ["==", "!=", ">", ">=", "<", "<="] as const
const SCALAR_TYPES: readonly ScalarType[] = ["number", "string", "boolean"] as const

function isLegacyVariableReference(value: ValueExpressionOutput): value is LegacyVariableReference {
  return typeof value === "object" && value !== null && "scope" in value && "variableId" in value
}

function isValueSource(value: ValueExpressionOutput): value is ValueSourceExpression {
  return typeof value === "object" && value !== null && "source" in value
}

function isScalarDefinition(definition: VariableDefinition | null | undefined): definition is ScalarVariableDefinition {
  return definition?.type === "number" || definition?.type === "string" || definition?.type === "boolean"
}

function isCollectionDefinition(definition: VariableDefinition | null | undefined): definition is CollectionVariableDefinition {
  return definition?.type === "list" || definition?.type === "map"
}

function variableSignature(definition: VariableDefinition): string {
  if (isCollectionDefinition(definition)) {
    return `${definition.id}::${definition.type}::${definition.itemType}`
  }
  return `${definition.id}::${definition.type}::-`
}

function dedupeVariablesBySignature(definitions: VariableDefinition[]): VariableDefinition[] {
  const seen = new Set<string>()
  const output: VariableDefinition[] = []
  for (const definition of definitions) {
    const signature = variableSignature(definition)
    if (seen.has(signature)) continue
    seen.add(signature)
    output.push(definition)
  }
  return output
}

function intersectVariableSetsBySignature(sets: VariableDefinition[][]): VariableDefinition[] {
  if (sets.length === 0) return []
  if (sets.length === 1) return dedupeVariablesBySignature(sets[0] ?? [])

  const intersection = new Map<string, VariableDefinition>()
  for (const definition of sets[0] ?? []) {
    intersection.set(variableSignature(definition), definition)
  }

  for (let index = 1; index < sets.length; index += 1) {
    const currentSignatures = new Set((sets[index] ?? []).map((definition) => variableSignature(definition)))
    for (const signature of intersection.keys()) {
      if (!currentSignatures.has(signature)) {
        intersection.delete(signature)
      }
    }
  }

  return dedupeVariablesBySignature([...intersection.values()])
}

function getScopedObjectVariables(
  target: ValueTarget,
  context: VariableSelectionContext
): ProjectV1["variables"]["global"] {
  if (target === "other") {
    return context.otherObjectVariables ?? []
  }
  return context.selfObjectVariables
}

function normalizeSourceTargetExpression(
  expression: ValueExpressionOutput,
  context: VariableSelectionContext
): ValueExpressionOutput {
  if (!isValueSource(expression)) return expression
  if (expression.source !== "attribute" && expression.source !== "internalVariable") return expression

  const normalizedTarget: "self" | "other" =
    normalizeTargetValue(expression.target, Boolean(context.allowOtherTarget), false) === "other"
      ? "other"
      : "self"
  if (expression.target === normalizedTarget) return expression

  return {
    ...expression,
    target: normalizedTarget
  }
}

function getScalarDefinitionsForScope(
  scope: "global" | "object",
  target: ValueTarget,
  context: VariableSelectionContext
): ScalarVariableDefinition[] {
  if (scope === "global") {
    return context.globalVariables.filter((definition): definition is ScalarVariableDefinition =>
      isScalarDefinition(definition)
    )
  }

  return getScopedObjectVariables(target, context).filter((definition): definition is ScalarVariableDefinition =>
    isScalarDefinition(definition)
  )
}

function getCollectionDefinitionsForScope(
  scope: "global" | "object",
  target: ValueTarget,
  collectionType: CollectionType,
  context: VariableSelectionContext
): CollectionVariableDefinition[] {
  if (scope === "global") {
    return context.globalVariables.filter(
      (definition): definition is CollectionVariableDefinition =>
        isCollectionDefinition(definition) && definition.type === collectionType
    )
  }

  return getScopedObjectVariables(target, context).filter(
    (definition): definition is CollectionVariableDefinition =>
      isCollectionDefinition(definition) && definition.type === collectionType
  )
}

function getCollectionTypeForActionType(type: CollectionActionType): CollectionType {
  return type === "listPush" || type === "listSetAt" || type === "listRemoveAt" || type === "listClear"
    ? "list"
    : "map"
}

export function buildVariableUniverse(context: VariableUniverseContext): VariableUniverse {
  const allowOtherTarget = Boolean(context.allowOtherTarget)
  const otherSets = context.otherObjectVariableSets ?? []
  const otherObjectVariablesUnion = dedupeVariablesBySignature(otherSets.flatMap((entries) => entries))
  const otherObjectVariablesIntersection = intersectVariableSetsBySignature(otherSets)

  const otherObjectVariables =
    !allowOtherTarget
      ? []
      : otherSets.length <= 1
        ? dedupeVariablesBySignature(otherSets[0] ?? [])
        : otherObjectVariablesIntersection

  return {
    globalVariables: context.globalVariables,
    selfObjectVariables: context.selfObjectVariables,
    otherObjectVariables,
    otherObjectVariablesUnion,
    otherObjectVariablesIntersection,
    allowOtherTarget
  }
}

export function selectTargetVariables<T>({
  selfVariables,
  otherVariables,
  target,
  allowOtherTarget
}: {
  selfVariables: T[]
  otherVariables: T[]
  target: ValueTarget
  allowOtherTarget: boolean
}): T[] {
  if (allowOtherTarget && target === "other") {
    return otherVariables
  }
  return selfVariables
}

export function hasAnyTargetVariables<T>({
  selfVariables,
  otherVariables,
  allowOtherTarget
}: {
  selfVariables: T[]
  otherVariables: T[]
  allowOtherTarget: boolean
}): boolean {
  if (!allowOtherTarget) {
    return selfVariables.length > 0
  }
  return selfVariables.length > 0 || otherVariables.length > 0
}

export function getDefaultScalarLiteral(type: ScalarType): number | string | boolean {
  if (type === "number") return 0
  if (type === "boolean") return false
  return ""
}

export function getDefaultValueExpressionForType(type: ScalarType): ValueExpressionOutput {
  return { source: "literal", value: getDefaultScalarLiteral(type) }
}

export function normalizeTargetValue(
  target: ValueTarget | null | undefined,
  allowOtherTarget: boolean,
  allowInstanceTarget = true
): ValueTarget {
  if (target === "instanceId" && allowInstanceTarget) return "instanceId"
  if (target === "other" && allowOtherTarget) return "other"
  return "self"
}

export function resolveVariableDefinition(
  reference: {
    scope: "global" | "object"
    variableId: string
    target?: ValueTarget | null | undefined
  },
  context: VariableSelectionContext
): VariableDefinition | null {
  if (reference.scope === "global") {
    return context.globalVariables.find((definition) => definition.id === reference.variableId) ?? null
  }

  const normalizedTarget = normalizeTargetValue(
    reference.target,
    Boolean(context.allowOtherTarget),
    context.allowInstanceTarget ?? true
  )
  return getScopedObjectVariables(normalizedTarget, context).find((definition) => definition.id === reference.variableId) ?? null
}

export function resolveScalarType(
  expression: ValueExpressionOutput | LegacyVariableReference | undefined,
  context: VariableSelectionContext
): ScalarType | null {
  if (expression === undefined) return null
  if (typeof expression === "number") return "number"
  if (typeof expression === "string") return "string"
  if (typeof expression === "boolean") return "boolean"

  if (isLegacyVariableReference(expression)) {
    const variable = resolveVariableDefinition(
      { scope: expression.scope, variableId: expression.variableId, target: "self" },
      context
    )
    return isScalarDefinition(variable) ? variable.type : null
  }

  const normalizedExpression = normalizeSourceTargetExpression(expression, context)
  if (!isValueSource(normalizedExpression)) return null

  if (normalizedExpression.source === "literal") {
    const literalType = typeof normalizedExpression.value
    return SCALAR_TYPES.includes(literalType as ScalarType) ? (literalType as ScalarType) : null
  }
  if (normalizedExpression.source === "random") return "number"
  if (normalizedExpression.source === "attribute") return "number"
  if (normalizedExpression.source === "mouseAttribute") return "number"

  if (normalizedExpression.source === "globalVariable") {
    const variable = context.globalVariables.find((definition) => definition.id === normalizedExpression.variableId)
    return isScalarDefinition(variable) ? variable.type : null
  }

  if (normalizedExpression.source === "internalVariable") {
    const scopedVariables = getScopedObjectVariables(normalizedExpression.target, context)
    const variable = scopedVariables.find((definition) => definition.id === normalizedExpression.variableId)
    return isScalarDefinition(variable) ? variable.type : null
  }

  if (normalizedExpression.source === "iterationVariable") {
    const variable = (context.iterationVariables ?? []).find(
      (entry) => entry.name === normalizedExpression.variableName
    )
    return variable?.type ?? null
  }

  return null
}

export function resolveCollectionItemType(
  reference: {
    scope: "global" | "object"
    variableId: string
    target?: ValueTarget | null | undefined
  },
  context: VariableSelectionContext
): ScalarType | null {
  const variable = resolveVariableDefinition(reference, context)
  if (!isCollectionDefinition(variable)) return null
  return variable.itemType
}

export function getAllowedIfOperators(leftType: ScalarType): IfOperator[] {
  if (leftType === "number") return [...ALL_IF_OPERATORS]
  return ["==", "!="]
}

export function normalizeValueExpressionForType(
  expression: ValueExpressionOutput,
  expectedType: ScalarType,
  context: VariableSelectionContext
): ValueExpressionOutput {
  const normalizedExpression = normalizeSourceTargetExpression(expression, context)
  const resolvedType = resolveScalarType(normalizedExpression, context)
  if (resolvedType === expectedType) return normalizedExpression
  return getDefaultValueExpressionForType(expectedType)
}

export function normalizeIfConditionDraft(
  draft: IfConditionDraft,
  context: VariableSelectionContext
): IfConditionDraft {
  const left = normalizeSourceTargetExpression(draft.left, context)
  const leftType = resolveScalarType(left, context) ?? "number"
  const allowedOperators = getAllowedIfOperators(leftType)
  const operator = allowedOperators.includes(draft.operator) ? draft.operator : "=="

  return {
    left,
    operator,
    right: normalizeValueExpressionForType(draft.right, leftType, context)
  }
}

export function normalizeChangeVariableDraft(
  draft: ChangeVariableDraft,
  context: VariableSelectionContext
): ChangeVariableDraft {
  const normalizedTarget = normalizeTargetValue(
    draft.target,
    Boolean(context.allowOtherTarget),
    context.allowInstanceTarget ?? true
  )

  const scalarDefinitions = getScalarDefinitionsForScope(draft.scope, normalizedTarget, context)
  const selectedVariable = scalarDefinitions.find((definition) => definition.id === draft.variableId)
  const effectiveVariable = selectedVariable ?? scalarDefinitions[0] ?? null
  const scalarType = effectiveVariable?.type ?? null

  const operator = scalarType === "number" ? draft.operator : "set"
  const expectedValueType = operator === "set" ? (scalarType ?? "number") : "number"

  return {
    ...draft,
    variableId: effectiveVariable?.id ?? draft.variableId,
    operator,
    value: normalizeValueExpressionForType(draft.value, expectedValueType, context),
    target: normalizedTarget,
    targetInstanceId: normalizedTarget === "instanceId" ? (draft.targetInstanceId ?? null) : null
  }
}

export function normalizeCollectionActionDraft<T extends CollectionActionDraft>(
  draft: T,
  context: VariableSelectionContext
): T {
  const normalizedTarget = normalizeTargetValue(
    draft.target,
    Boolean(context.allowOtherTarget),
    context.allowInstanceTarget ?? true
  )

  const expectedCollectionType = getCollectionTypeForActionType(draft.type)
  const collectionDefinitions = getCollectionDefinitionsForScope(
    draft.scope,
    normalizedTarget,
    expectedCollectionType,
    context
  )
  const selectedVariable = collectionDefinitions.find((definition) => definition.id === draft.variableId)
  const effectiveVariable = selectedVariable ?? collectionDefinitions[0] ?? null
  const itemType = effectiveVariable?.itemType ?? "number"

  const normalizedDraft: CollectionActionDraft = {
    ...draft,
    variableId: effectiveVariable?.id ?? "",
    target: normalizedTarget,
    targetInstanceId: normalizedTarget === "instanceId" ? (draft.targetInstanceId ?? null) : null
  }

  if ("value" in normalizedDraft) {
    normalizedDraft.value = normalizeValueExpressionForType(normalizedDraft.value, itemType, context)
  }
  if ("index" in normalizedDraft) {
    normalizedDraft.index = normalizeValueExpressionForType(normalizedDraft.index, "number", context)
  }
  if ("key" in normalizedDraft) {
    normalizedDraft.key = normalizeValueExpressionForType(normalizedDraft.key, "string", context)
  }

  return normalizedDraft as T
}

export function inferPayloadType(payload: ValueExpressionOutput, context: VariableSelectionContext): ScalarType {
  return resolveScalarType(payload, context) ?? "number"
}

export function normalizeEmitPayloadDraft<T extends { payload: ValueExpressionOutput }>(
  draft: T,
  expectedType: ScalarType,
  context: VariableSelectionContext
): T {
  return {
    ...draft,
    payload: normalizeValueExpressionForType(draft.payload, expectedType, context)
  }
}

export function isCompatibleGlobalAndObjectScalarPair(
  globalVariableId: string,
  objectVariableId: string,
  context: VariableSelectionContext,
  target: ValueTarget = "self"
): boolean {
  const globalVariable = context.globalVariables.find((definition) => definition.id === globalVariableId)
  const objectVariable = resolveVariableDefinition(
    { scope: "object", variableId: objectVariableId, target },
    context
  )

  if (!isScalarDefinition(globalVariable) || !isScalarDefinition(objectVariable)) {
    return false
  }

  return globalVariable.type === objectVariable.type
}

export function getFirstCompatibleObjectVariableId(
  globalVariableId: string,
  context: VariableSelectionContext,
  target: ValueTarget = "self"
): string | null {
  const globalVariable = context.globalVariables.find((definition) => definition.id === globalVariableId)
  if (!isScalarDefinition(globalVariable)) return null

  const objectVariables = getScalarDefinitionsForScope("object", target, context)
  const candidate = objectVariables.find((definition) => definition.type === globalVariable.type)
  return candidate?.id ?? null
}

export function getFirstCompatibleGlobalVariableId(
  objectVariableId: string,
  context: VariableSelectionContext,
  target: ValueTarget = "self"
): string | null {
  const objectVariable = resolveVariableDefinition(
    { scope: "object", variableId: objectVariableId, target },
    context
  )
  if (!isScalarDefinition(objectVariable)) return null

  const candidate = context.globalVariables.find(
    (definition) => isScalarDefinition(definition) && definition.type === objectVariable.type
  )
  return candidate?.id ?? null
}

export function normalizeCopyVariableDraft(
  draft: CopyVariableDraft,
  context: VariableSelectionContext
): CopyVariableDraft {
  const normalizedTarget = normalizeTargetValue(
    draft.instanceTarget,
    Boolean(context.allowOtherTarget),
    context.allowInstanceTarget ?? true
  )

  let globalVariableId = draft.globalVariableId
  let objectVariableId = draft.objectVariableId

  const scalarGlobal = context.globalVariables.filter((definition): definition is ScalarVariableDefinition =>
    isScalarDefinition(definition)
  )
  const scalarObject = getScalarDefinitionsForScope("object", normalizedTarget, context)

  const currentGlobal = scalarGlobal.find((definition) => definition.id === globalVariableId) ?? scalarGlobal[0] ?? null
  const currentObject = scalarObject.find((definition) => definition.id === objectVariableId) ?? scalarObject[0] ?? null

  if (draft.direction === "globalToObject") {
    if (currentGlobal) {
      globalVariableId = currentGlobal.id
      const compatibleObject = scalarObject.find((definition) => definition.type === currentGlobal.type)
      if (compatibleObject) {
        objectVariableId = compatibleObject.id
      } else if (currentObject) {
        objectVariableId = currentObject.id
        const compatibleGlobal = scalarGlobal.find((definition) => definition.type === currentObject.type)
        if (compatibleGlobal) globalVariableId = compatibleGlobal.id
      }
    } else if (currentObject) {
      objectVariableId = currentObject.id
      const compatibleGlobal = scalarGlobal.find((definition) => definition.type === currentObject.type)
      if (compatibleGlobal) globalVariableId = compatibleGlobal.id
    }
  } else {
    if (currentObject) {
      objectVariableId = currentObject.id
      const compatibleGlobal = scalarGlobal.find((definition) => definition.type === currentObject.type)
      if (compatibleGlobal) {
        globalVariableId = compatibleGlobal.id
      } else if (currentGlobal) {
        globalVariableId = currentGlobal.id
        const compatibleObject = scalarObject.find((definition) => definition.type === currentGlobal.type)
        if (compatibleObject) objectVariableId = compatibleObject.id
      }
    } else if (currentGlobal) {
      globalVariableId = currentGlobal.id
      const compatibleObject = scalarObject.find((definition) => definition.type === currentGlobal.type)
      if (compatibleObject) objectVariableId = compatibleObject.id
    }
  }

  return {
    ...draft,
    instanceTarget: normalizedTarget,
    instanceTargetId: normalizedTarget === "instanceId" ? draft.instanceTargetId : null,
    globalVariableId,
    objectVariableId
  }
}

export function canRandomizeVariable(
  reference: {
    scope: "global" | "object"
    variableId: string
    target?: ValueTarget | null | undefined
  },
  context: VariableSelectionContext
): boolean {
  const variable = resolveVariableDefinition(reference, context)
  return variable?.type === "number"
}

export function getScalarObjectDefinitions(
  definitions: ProjectV1["variables"]["global"]
): ScalarVariableDefinition[] {
  return definitions.filter((definition): definition is ScalarVariableDefinition => isScalarDefinition(definition))
}

export function getCollectionObjectDefinitions(
  definitions: ProjectV1["variables"]["global"],
  type: CollectionType
): CollectionVariableDefinition[] {
  return definitions.filter(
    (definition): definition is CollectionVariableDefinition => isCollectionDefinition(definition) && definition.type === type
  )
}

export function formatTargetQualifiedName(target: ValueTarget, name: string): string {
  return `${target}.${name}`
}
