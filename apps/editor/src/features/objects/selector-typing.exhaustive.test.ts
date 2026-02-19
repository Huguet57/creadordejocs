import { describe, expect, it } from "vitest"
import {
  ALL_IF_OPERATORS,
  buildVariableUniverse,
  canRandomizeVariable,
  formatTargetQualifiedName,
  getAllowedIfOperators,
  getDefaultScalarLiteral,
  getDefaultValueExpressionForType,
  getFirstCompatibleGlobalVariableId,
  getFirstCompatibleObjectVariableId,
  hasAnyTargetVariables,
  inferPayloadType,
  isCompatibleGlobalAndObjectScalarPair,
  normalizeChangeVariableDraft,
  normalizeCollectionActionDraft,
  normalizeCopyVariableDraft,
  normalizeEmitPayloadDraft,
  normalizeIfConditionDraft,
  normalizeTargetValue,
  normalizeValueExpressionForType,
  resolveCollectionItemType,
  resolveScalarType,
  resolveVariableDefinition,
  selectTargetVariables,
  type ChangeVariableDraft,
  type CollectionActionDraft,
  type CopyVariableDraft,
  type EmitPayloadDraft,
  type IfConditionDraft,
  type ScalarType,
  type VariableSelectionContext
} from "./variable-selection-model.js"

function numVar(id: string, name: string, initialValue = 0) {
  return { id, name, type: "number" as const, initialValue }
}

function strVar(id: string, name: string, initialValue = "") {
  return { id, name, type: "string" as const, initialValue }
}

function boolVar(id: string, name: string, initialValue = false) {
  return { id, name, type: "boolean" as const, initialValue }
}

function listVar(id: string, name: string, itemType: ScalarType, initialValue: (number | string | boolean)[]) {
  return { id, name, type: "list" as const, itemType, initialValue }
}

function mapVar(id: string, name: string, itemType: ScalarType, initialValue: Record<string, number | string | boolean>) {
  return { id, name, type: "map" as const, itemType, initialValue }
}

const globalVariables = [
  numVar("gv-num", "gNum", 10),
  strVar("gv-str", "gStr", "hello"),
  boolVar("gv-bool", "gBool", true),
  listVar("gv-list-num", "gListNum", "number", [1, 2]),
  listVar("gv-list-str", "gListStr", "string", ["a", "b"]),
  listVar("gv-list-bool", "gListBool", "boolean", [true, false]),
  mapVar("gv-map-num", "gMapNum", "number", { hp: 10 }),
  mapVar("gv-map-bool", "gMapBool", "boolean", { alive: true }),
  numVar("gv-dup-a", "dupName", 1),
  numVar("gv-dup-b", "dupName", 2)
]

const selfObjectVariables = [
  numVar("ov-self-num", "selfNum", 1),
  strVar("ov-self-str", "selfStr", "x"),
  boolVar("ov-self-bool", "selfBool", true),
  listVar("ov-self-list-num", "selfListNum", "number", [5]),
  listVar("ov-self-list-str", "selfListStr", "string", ["x"]),
  mapVar("ov-self-map-num", "selfMapNum", "number", { hp: 5 }),
  mapVar("ov-self-map-bool", "selfMapBool", "boolean", { alive: true })
]

const otherObjectVariablesA = [
  numVar("ov-other-num", "otherNum", 2),
  strVar("ov-other-str", "otherStr", "y"),
  boolVar("ov-other-bool", "otherBool", false),
  listVar("ov-other-list-num", "otherListNum", "number", [10, 20]),
  mapVar("ov-other-map-num", "otherMapNum", "number", { hp: 8 }),
  numVar("ov-common-num", "commonNum", 99),
  listVar("ov-common-list", "commonList", "string", ["a"]),
  numVar("ov-dup-type", "dupType", 1),
  numVar("ov-same-name-a", "sameName", 5)
]

const otherObjectVariablesB = [
  numVar("ov-other-b-num", "otherBNum", 3),
  listVar("ov-other-b-list-num", "otherBListNum", "number", [30]),
  mapVar("ov-other-b-map-num", "otherBMapNum", "number", { hp: 12 }),
  numVar("ov-common-num", "commonNum", 100),
  listVar("ov-common-list", "commonList", "string", ["b"]),
  strVar("ov-dup-type", "dupType", "oops"),
  numVar("ov-same-name-b", "sameName", 7)
]

const baseContext: VariableSelectionContext = {
  globalVariables,
  selfObjectVariables,
  otherObjectVariables: otherObjectVariablesA,
  allowOtherTarget: true,
  iterationVariables: [
    { name: "iterNum", type: "number" },
    { name: "iterStr", type: "string" },
    { name: "iterBool", type: "boolean" }
  ]
}

type ExhaustiveCase = {
  id: string
  given: string
  when: string
  expect: string
  run: () => void
}

const srCases: ExhaustiveCase[] = [
  {
    id: "SR-001",
    given: "global variables definides",
    when: "es construeix l'univers",
    expect: "scope global mostra globals",
    run: () => {
      const universe = buildVariableUniverse({
        globalVariables,
        selfObjectVariables,
        otherObjectVariableSets: [otherObjectVariablesA],
        allowOtherTarget: true
      })
      expect(universe.globalVariables.map((entry) => entry.id)).toEqual(globalVariables.map((entry) => entry.id))
    }
  },
  {
    id: "SR-002",
    given: "self i other disponibles",
    when: "target self",
    expect: "nomes variables self",
    run: () => {
      const selected = selectTargetVariables({
        selfVariables: selfObjectVariables,
        otherVariables: otherObjectVariablesA,
        target: "self",
        allowOtherTarget: true
      })
      expect(selected.map((entry) => entry.id)).toEqual(selfObjectVariables.map((entry) => entry.id))
    }
  },
  {
    id: "SR-003",
    given: "self i other disponibles",
    when: "target other",
    expect: "nomes variables other",
    run: () => {
      const selected = selectTargetVariables({
        selfVariables: selfObjectVariables,
        otherVariables: otherObjectVariablesA,
        target: "other",
        allowOtherTarget: true
      })
      expect(selected.map((entry) => entry.id)).toEqual(otherObjectVariablesA.map((entry) => entry.id))
    }
  },
  {
    id: "SR-004",
    given: "event no-collision",
    when: "target other",
    expect: "other inhabilitat",
    run: () => {
      expect(normalizeTargetValue("other", false)).toBe("self")
    }
  },
  {
    id: "SR-005",
    given: "collision amb target especific",
    when: "es construeix univers amb un sol set other",
    expect: "target other es preserva amb variables completes",
    run: () => {
      const universe = buildVariableUniverse({
        globalVariables,
        selfObjectVariables,
        otherObjectVariableSets: [otherObjectVariablesA],
        allowOtherTarget: true
      })
      expect(universe.otherObjectVariables.map((entry) => entry.id)).toEqual(otherObjectVariablesA.map((entry) => entry.id))
    }
  },
  {
    id: "SR-006",
    given: "collision Any object",
    when: "es construeix univers amb multiples sets other",
    expect: "s'aplica interseccio de variables other",
    run: () => {
      const universe = buildVariableUniverse({
        globalVariables,
        selfObjectVariables,
        otherObjectVariableSets: [otherObjectVariablesA, otherObjectVariablesB],
        allowOtherTarget: true
      })
      expect(universe.otherObjectVariables.map((entry) => entry.id).sort()).toEqual(["ov-common-list", "ov-common-num"])
    }
  },
  {
    id: "SR-007",
    given: "scope global a object",
    when: "target other valid en collision",
    expect: "es conserva target valid",
    run: () => {
      expect(normalizeTargetValue("other", true)).toBe("other")
    }
  },
  {
    id: "SR-008",
    given: "scope object a global",
    when: "es resol variable global amb target present",
    expect: "target fields queden semanticament ignorats",
    run: () => {
      const variable = resolveVariableDefinition(
        { scope: "global", variableId: "gv-num", target: "other" },
        baseContext
      )
      expect(variable?.id).toBe("gv-num")
    }
  },
  {
    id: "SR-009",
    given: "variable id inexistent",
    when: "es resol tipus scalar",
    expect: "fallback segur null",
    run: () => {
      const type = resolveScalarType({ scope: "global", variableId: "missing-var" }, baseContext)
      expect(type).toBeNull()
    }
  },
  {
    id: "SR-010",
    given: "noms duplicats amb ids diferents",
    when: "seleccio per id",
    expect: "no es trenca amb duplicats de nom",
    run: () => {
      const first = resolveVariableDefinition({ scope: "global", variableId: "gv-dup-a" }, baseContext)
      const second = resolveVariableDefinition({ scope: "global", variableId: "gv-dup-b" }, baseContext)
      expect(first?.id).toBe("gv-dup-a")
      expect(second?.id).toBe("gv-dup-b")
    }
  },
  {
    id: "SR-011",
    given: "mateix id en other amb tipus diferent",
    when: "interseccio per signatura",
    expect: "l'id conflictiv s'exclou de la interseccio",
    run: () => {
      const universe = buildVariableUniverse({
        globalVariables,
        selfObjectVariables,
        otherObjectVariableSets: [otherObjectVariablesA, otherObjectVariablesB],
        allowOtherTarget: true
      })
      expect(universe.otherObjectVariables.some((entry) => entry.id === "ov-dup-type")).toBe(false)
    }
  },
  {
    id: "SR-012",
    given: "allowOtherTarget=false",
    when: "hi ha variables other disponibles",
    expect: "other queda ignorat",
    run: () => {
      const universe = buildVariableUniverse({
        globalVariables,
        selfObjectVariables,
        otherObjectVariableSets: [otherObjectVariablesA],
        allowOtherTarget: false
      })
      expect(universe.otherObjectVariables).toEqual([])
    }
  },
  {
    id: "SR-013",
    given: "target instanceId",
    when: "context no el suporta",
    expect: "nomes disponible on toca",
    run: () => {
      expect(normalizeTargetValue("instanceId", true, false)).toBe("self")
      expect(normalizeTargetValue("instanceId", true, true)).toBe("instanceId")
    }
  },
  {
    id: "SR-014",
    given: "selectors sense variables",
    when: "es calcula disponibilitat",
    expect: "retorn segur sense crash",
    run: () => {
      expect(
        hasAnyTargetVariables({
          selfVariables: [],
          otherVariables: [],
          allowOtherTarget: true
        })
      ).toBe(false)
    }
  }
]

const ifOpCases: ExhaustiveCase[] = [
  {
    id: "IF-001",
    given: "left number",
    when: "consultar operadors",
    expect: "== != > >= < <=",
    run: () => {
      expect(getAllowedIfOperators("number")).toEqual([...ALL_IF_OPERATORS])
    }
  },
  {
    id: "IF-002",
    given: "left string",
    when: "consultar operadors",
    expect: "nomes == !=",
    run: () => {
      expect(getAllowedIfOperators("string")).toEqual(["==", "!="])
    }
  },
  {
    id: "IF-003",
    given: "left boolean",
    when: "consultar operadors",
    expect: "nomes == !=",
    run: () => {
      expect(getAllowedIfOperators("boolean")).toEqual(["==", "!="])
    }
  },
  {
    id: "IF-004",
    given: "left boolean",
    when: "operator numeric",
    expect: "autocorreccio a ==",
    run: () => {
      const draft: IfConditionDraft = {
        left: { source: "globalVariable", variableId: "gv-bool" },
        operator: ">",
        right: { source: "literal", value: true }
      }
      expect(normalizeIfConditionDraft(draft, baseContext).operator).toBe("==")
    }
  },
  {
    id: "IF-005",
    given: "left string",
    when: "operator numeric",
    expect: "autocorreccio a ==",
    run: () => {
      const draft: IfConditionDraft = {
        left: { source: "globalVariable", variableId: "gv-str" },
        operator: "<",
        right: { source: "literal", value: "a" }
      }
      expect(normalizeIfConditionDraft(draft, baseContext).operator).toBe("==")
    }
  },
  {
    id: "IF-006",
    given: "left string",
    when: "right incompatibe number",
    expect: "right reinicialitzat a string",
    run: () => {
      const draft: IfConditionDraft = {
        left: { source: "globalVariable", variableId: "gv-str" },
        operator: "==",
        right: { source: "literal", value: 9 }
      }
      expect(normalizeIfConditionDraft(draft, baseContext).right).toEqual({ source: "literal", value: "" })
    }
  },
  {
    id: "IF-007",
    given: "comparacio de tipus diferents",
    when: "normalitzacio",
    expect: "incompatible bloquejat amb valor default del tipus esquerre",
    run: () => {
      const draft: IfConditionDraft = {
        left: { source: "globalVariable", variableId: "gv-num" },
        operator: "==",
        right: { source: "literal", value: "bad" }
      }
      expect(normalizeIfConditionDraft(draft, baseContext).right).toEqual({ source: "literal", value: 0 })
    }
  },
  {
    id: "IF-008",
    given: "ref other en no-collision",
    when: "resolucio de tipus",
    expect: "normalitzat a self o bloquejat",
    run: () => {
      const nonCollisionContext: VariableSelectionContext = {
        ...baseContext,
        allowOtherTarget: false
      }
      const type = resolveScalarType(
        { source: "internalVariable", target: "other", variableId: "ov-other-bool" },
        nonCollisionContext
      )
      expect(type).toBeNull()
    }
  }
]

const cvCases: ExhaustiveCase[] = [
  {
    id: "CV-001",
    given: "changeVariable set number",
    when: "value number",
    expect: "acceptat",
    run: () => {
      const draft: ChangeVariableDraft = {
        type: "changeVariable",
        scope: "global",
        variableId: "gv-num",
        operator: "set",
        value: { source: "literal", value: 7 },
        target: "self",
        targetInstanceId: null
      }
      expect(normalizeChangeVariableDraft(draft, baseContext).value).toEqual({ source: "literal", value: 7 })
    }
  },
  {
    id: "CV-002",
    given: "changeVariable set string",
    when: "value string",
    expect: "acceptat",
    run: () => {
      const draft: ChangeVariableDraft = {
        type: "changeVariable",
        scope: "global",
        variableId: "gv-str",
        operator: "set",
        value: { source: "literal", value: "ok" },
        target: "self",
        targetInstanceId: null
      }
      expect(normalizeChangeVariableDraft(draft, baseContext).value).toEqual({ source: "literal", value: "ok" })
    }
  },
  {
    id: "CV-003",
    given: "changeVariable set boolean",
    when: "value boolean",
    expect: "acceptat",
    run: () => {
      const draft: ChangeVariableDraft = {
        type: "changeVariable",
        scope: "global",
        variableId: "gv-bool",
        operator: "set",
        value: { source: "literal", value: true },
        target: "self",
        targetInstanceId: null
      }
      expect(normalizeChangeVariableDraft(draft, baseContext).value).toEqual({ source: "literal", value: true })
    }
  },
  {
    id: "CV-004",
    given: "changeVariable add sobre string",
    when: "normalitzacio",
    expect: "add nomes number -> set",
    run: () => {
      const draft: ChangeVariableDraft = {
        type: "changeVariable",
        scope: "global",
        variableId: "gv-str",
        operator: "add",
        value: { source: "literal", value: 1 },
        target: "self",
        targetInstanceId: null
      }
      expect(normalizeChangeVariableDraft(draft, baseContext).operator).toBe("set")
    }
  },
  {
    id: "CV-005",
    given: "changeVariable subtract sobre boolean",
    when: "normalitzacio",
    expect: "subtract nomes number -> set",
    run: () => {
      const draft: ChangeVariableDraft = {
        type: "changeVariable",
        scope: "global",
        variableId: "gv-bool",
        operator: "subtract",
        value: { source: "literal", value: 2 },
        target: "self",
        targetInstanceId: null
      }
      expect(normalizeChangeVariableDraft(draft, baseContext).operator).toBe("set")
    }
  },
  {
    id: "CV-006",
    given: "changeVariable multiply sobre string",
    when: "normalitzacio",
    expect: "multiply nomes number -> set",
    run: () => {
      const draft: ChangeVariableDraft = {
        type: "changeVariable",
        scope: "global",
        variableId: "gv-str",
        operator: "multiply",
        value: { source: "literal", value: 2 },
        target: "self",
        targetInstanceId: null
      }
      expect(normalizeChangeVariableDraft(draft, baseContext).operator).toBe("set")
    }
  },
  {
    id: "CV-007",
    given: "canvi de variable a string",
    when: "operator numeric existent",
    expect: "forca set",
    run: () => {
      const draft: ChangeVariableDraft = {
        type: "changeVariable",
        scope: "object",
        variableId: "ov-self-str",
        operator: "add",
        value: { source: "literal", value: 1 },
        target: "self",
        targetInstanceId: null
      }
      expect(normalizeChangeVariableDraft(draft, baseContext).operator).toBe("set")
    }
  },
  {
    id: "CV-008",
    given: "canvi de variable a boolean",
    when: "operator numeric existent",
    expect: "forca set",
    run: () => {
      const draft: ChangeVariableDraft = {
        type: "changeVariable",
        scope: "object",
        variableId: "ov-self-bool",
        operator: "subtract",
        value: { source: "literal", value: 1 },
        target: "self",
        targetInstanceId: null
      }
      expect(normalizeChangeVariableDraft(draft, baseContext).operator).toBe("set")
    }
  },
  {
    id: "CV-009",
    given: "variable object target other de tipus string",
    when: "value incompatible number",
    expect: "default value segueix tipus real target other",
    run: () => {
      const draft: ChangeVariableDraft = {
        type: "changeVariable",
        scope: "object",
        variableId: "ov-other-str",
        operator: "set",
        value: { source: "literal", value: 9 },
        target: "other",
        targetInstanceId: null
      }
      expect(normalizeChangeVariableDraft(draft, baseContext).value).toEqual({ source: "literal", value: "" })
    }
  },
  {
    id: "CV-010",
    given: "randomizeVariable",
    when: "target no numeric",
    expect: "nomes target number permess",
    run: () => {
      expect(
        canRandomizeVariable(
          { scope: "global", variableId: "gv-num", target: "self" },
          baseContext
        )
      ).toBe(true)
      expect(
        canRandomizeVariable(
          { scope: "global", variableId: "gv-str", target: "self" },
          baseContext
        )
      ).toBe(false)
    }
  },
  {
    id: "CV-011",
    given: "copyVariable global<->object incompatible",
    when: "normalitzacio",
    expect: "nomes parelles compatibles",
    run: () => {
      const draft: CopyVariableDraft = {
        type: "copyVariable",
        direction: "globalToObject",
        globalVariableId: "gv-str",
        objectVariableId: "ov-self-num",
        instanceTarget: "self",
        instanceTargetId: null
      }
      const normalized = normalizeCopyVariableDraft(draft, baseContext)
      expect(
        isCompatibleGlobalAndObjectScalarPair(
          normalized.globalVariableId,
          normalized.objectVariableId,
          baseContext,
          normalized.instanceTarget
        )
      ).toBe(true)
    }
  },
  {
    id: "CV-012",
    given: "copyVariable amb target other",
    when: "canvia source/destination",
    expect: "preserva instanceTarget valid",
    run: () => {
      const draft: CopyVariableDraft = {
        type: "copyVariable",
        direction: "objectToGlobal",
        globalVariableId: "gv-num",
        objectVariableId: "ov-other-str",
        instanceTarget: "other",
        instanceTargetId: null
      }
      const normalized = normalizeCopyVariableDraft(draft, baseContext)
      expect(normalized.instanceTarget).toBe("other")
      expect(
        isCompatibleGlobalAndObjectScalarPair(
          normalized.globalVariableId,
          normalized.objectVariableId,
          baseContext,
          "other"
        )
      ).toBe(true)
    }
  }
]

const clCases: ExhaustiveCase[] = [
  {
    id: "CL-001",
    given: "list<number>",
    when: "listPush value number",
    expect: "acceptat",
    run: () => {
      const draft: CollectionActionDraft = {
        type: "listPush",
        scope: "global",
        variableId: "gv-list-num",
        value: { source: "literal", value: 9 },
        target: "self",
        targetInstanceId: null
      }
      expect(normalizeCollectionActionDraft(draft, baseContext).value).toEqual({ source: "literal", value: 9 })
    }
  },
  {
    id: "CL-002",
    given: "list<string>",
    when: "listPush value string",
    expect: "acceptat",
    run: () => {
      const draft: CollectionActionDraft = {
        type: "listPush",
        scope: "global",
        variableId: "gv-list-str",
        value: { source: "literal", value: "x" },
        target: "self",
        targetInstanceId: null
      }
      expect(normalizeCollectionActionDraft(draft, baseContext).value).toEqual({ source: "literal", value: "x" })
    }
  },
  {
    id: "CL-003",
    given: "list<boolean>",
    when: "listPush value boolean",
    expect: "acceptat",
    run: () => {
      const draft: CollectionActionDraft = {
        type: "listPush",
        scope: "global",
        variableId: "gv-list-bool",
        value: { source: "literal", value: false },
        target: "self",
        targetInstanceId: null
      }
      expect(normalizeCollectionActionDraft(draft, baseContext).value).toEqual({ source: "literal", value: false })
    }
  },
  {
    id: "CL-004",
    given: "listSetAt",
    when: "index no numeric i value incompatible",
    expect: "valida index numeric i itemType",
    run: () => {
      const draft: CollectionActionDraft = {
        type: "listSetAt",
        scope: "global",
        variableId: "gv-list-num",
        index: { source: "literal", value: "bad" },
        value: { source: "literal", value: "bad" },
        target: "self",
        targetInstanceId: null
      }
      const normalized = normalizeCollectionActionDraft(draft, baseContext)
      expect(normalized.index).toEqual({ source: "literal", value: 0 })
      expect(normalized.value).toEqual({ source: "literal", value: 0 })
    }
  },
  {
    id: "CL-005",
    given: "listRemoveAt",
    when: "index no numeric",
    expect: "index numeric validat",
    run: () => {
      const draft: CollectionActionDraft = {
        type: "listRemoveAt",
        scope: "global",
        variableId: "gv-list-num",
        index: { source: "literal", value: "bad" },
        target: "self",
        targetInstanceId: null
      }
      const normalized = normalizeCollectionActionDraft(draft, baseContext)
      expect(normalized.index).toEqual({ source: "literal", value: 0 })
    }
  },
  {
    id: "CL-006",
    given: "listClear",
    when: "normalitzacio",
    expect: "no depen de itemType",
    run: () => {
      const draft: CollectionActionDraft = {
        type: "listClear",
        scope: "global",
        variableId: "gv-list-num",
        target: "self",
        targetInstanceId: null
      }
      const normalized = normalizeCollectionActionDraft(draft, baseContext)
      expect(normalized.variableId).toBe("gv-list-num")
    }
  },
  {
    id: "CL-007",
    given: "mapSet",
    when: "key no string i value incompatible",
    expect: "key string + value itemType",
    run: () => {
      const draft: CollectionActionDraft = {
        type: "mapSet",
        scope: "global",
        variableId: "gv-map-num",
        key: { source: "literal", value: 9 },
        value: { source: "literal", value: "bad" },
        target: "self",
        targetInstanceId: null
      }
      const normalized = normalizeCollectionActionDraft(draft, baseContext)
      expect(normalized.key).toEqual({ source: "literal", value: "" })
      expect(normalized.value).toEqual({ source: "literal", value: 0 })
    }
  },
  {
    id: "CL-008",
    given: "mapDelete",
    when: "key no string",
    expect: "key string validada",
    run: () => {
      const draft: CollectionActionDraft = {
        type: "mapDelete",
        scope: "global",
        variableId: "gv-map-num",
        key: { source: "literal", value: false },
        target: "self",
        targetInstanceId: null
      }
      const normalized = normalizeCollectionActionDraft(draft, baseContext)
      expect(normalized.key).toEqual({ source: "literal", value: "" })
    }
  },
  {
    id: "CL-009",
    given: "mapClear",
    when: "normalitzacio",
    expect: "coherent amb tipus map",
    run: () => {
      const draft: CollectionActionDraft = {
        type: "mapClear",
        scope: "global",
        variableId: "gv-map-num",
        target: "self",
        targetInstanceId: null
      }
      const normalized = normalizeCollectionActionDraft(draft, baseContext)
      expect(normalized.variableId).toBe("gv-map-num")
    }
  },
  {
    id: "CL-010",
    given: "scope global->object amb target other triat",
    when: "normalitzacio col·leccio",
    expect: "conserva target other",
    run: () => {
      const draft: CollectionActionDraft = {
        type: "listPush",
        scope: "object",
        variableId: "ov-other-list-num",
        value: { source: "literal", value: 7 },
        target: "other",
        targetInstanceId: null
      }
      expect(normalizeCollectionActionDraft(draft, baseContext).target).toBe("other")
    }
  },
  {
    id: "CL-011",
    given: "forEachList sobre target real",
    when: "itemType inferit",
    expect: "tipus local inferit des de self/other",
    run: () => {
      const selfType = resolveCollectionItemType(
        { scope: "object", variableId: "ov-self-list-str", target: "self" },
        baseContext
      )
      const otherType = resolveCollectionItemType(
        { scope: "object", variableId: "ov-other-list-num", target: "other" },
        baseContext
      )
      expect(selfType).toBe("string")
      expect(otherType).toBe("number")
    }
  },
  {
    id: "CL-012",
    given: "forEachMap sobre target real",
    when: "value local inferit",
    expect: "tipus map inferit des de target",
    run: () => {
      const selfType = resolveCollectionItemType(
        { scope: "object", variableId: "ov-self-map-bool", target: "self" },
        baseContext
      )
      const otherType = resolveCollectionItemType(
        { scope: "object", variableId: "ov-other-map-num", target: "other" },
        baseContext
      )
      expect(selfType).toBe("boolean")
      expect(otherType).toBe("number")
    }
  },
  {
    id: "CL-013",
    given: "collision Any object",
    when: "interseccio col·leccions other",
    expect: "usa interseccio",
    run: () => {
      const universe = buildVariableUniverse({
        globalVariables,
        selfObjectVariables,
        otherObjectVariableSets: [otherObjectVariablesA, otherObjectVariablesB],
        allowOtherTarget: true
      })
      expect(universe.otherObjectVariables.some((entry) => entry.id === "ov-common-list")).toBe(true)
    }
  },
  {
    id: "CL-014",
    given: "variable other no comuna",
    when: "collision Any object",
    expect: "queda exclosa",
    run: () => {
      const universe = buildVariableUniverse({
        globalVariables,
        selfObjectVariables,
        otherObjectVariableSets: [otherObjectVariablesA, otherObjectVariablesB],
        allowOtherTarget: true
      })
      expect(universe.otherObjectVariables.some((entry) => entry.id === "ov-other-list-num")).toBe(false)
    }
  },
  {
    id: "CL-015",
    given: "itemType list/map",
    when: "default de valor",
    expect: "segueix itemType",
    run: () => {
      const listItemType = resolveCollectionItemType({ scope: "global", variableId: "gv-list-str" }, baseContext)
      const mapItemType = resolveCollectionItemType({ scope: "global", variableId: "gv-map-bool" }, baseContext)
      expect(getDefaultScalarLiteral(listItemType ?? "number")).toBe("")
      expect(getDefaultScalarLiteral(mapItemType ?? "number")).toBe(false)
    }
  }
]

const vsCases: ExhaustiveCase[] = [
  {
    id: "VS-001",
    given: "literal scalar",
    when: "resolucio tipus",
    expect: "number/string/boolean",
    run: () => {
      expect(resolveScalarType(1, baseContext)).toBe("number")
      expect(resolveScalarType("a", baseContext)).toBe("string")
      expect(resolveScalarType(true, baseContext)).toBe("boolean")
    }
  },
  {
    id: "VS-002",
    given: "globalVariable source",
    when: "resolucio tipus",
    expect: "respecta expectedType",
    run: () => {
      expect(resolveScalarType({ source: "globalVariable", variableId: "gv-str" }, baseContext)).toBe("string")
    }
  },
  {
    id: "VS-003",
    given: "internalVariable self",
    when: "resolucio tipus",
    expect: "respecta expectedType",
    run: () => {
      expect(resolveScalarType({ source: "internalVariable", target: "self", variableId: "ov-self-bool" }, baseContext)).toBe("boolean")
    }
  },
  {
    id: "VS-004",
    given: "internalVariable other en collision",
    when: "resolucio tipus",
    expect: "respecta expectedType",
    run: () => {
      expect(resolveScalarType({ source: "internalVariable", target: "other", variableId: "ov-other-str" }, baseContext)).toBe("string")
    }
  },
  {
    id: "VS-005",
    given: "attribute source",
    when: "resolucio tipus",
    expect: "sempre number",
    run: () => {
      expect(resolveScalarType({ source: "attribute", target: "self", attribute: "x" }, baseContext)).toBe("number")
    }
  },
  {
    id: "VS-006",
    given: "mouseAttribute source",
    when: "resolucio tipus",
    expect: "sempre number",
    run: () => {
      expect(resolveScalarType({ source: "mouseAttribute", attribute: "y" }, baseContext)).toBe("number")
    }
  },
  {
    id: "VS-007",
    given: "iterationVariable source",
    when: "resolucio tipus",
    expect: "respecta tipus local",
    run: () => {
      expect(resolveScalarType({ source: "iterationVariable", variableName: "iterStr" }, baseContext)).toBe("string")
    }
  },
  {
    id: "VS-008",
    given: "random source",
    when: "expectedType no number",
    expect: "random nomes per number",
    run: () => {
      const normalized = normalizeValueExpressionForType(
        { source: "random", min: 1, max: 10, step: 1 },
        "string",
        baseContext
      )
      expect(normalized).toEqual({ source: "literal", value: "" })
    }
  },
  {
    id: "VS-009",
    given: "source incompatible",
    when: "normalitzacio",
    expect: "es normalitza/bloqueja",
    run: () => {
      const normalized = normalizeValueExpressionForType(
        { source: "attribute", target: "self", attribute: "x" },
        "boolean",
        baseContext
      )
      expect(normalized).toEqual({ source: "literal", value: false })
    }
  },
  {
    id: "VS-010",
    given: "label amb target",
    when: "format display",
    expect: "target-aware (self./other.)",
    run: () => {
      expect(formatTargetQualifiedName("self", "hp")).toBe("self.hp")
      expect(formatTargetQualifiedName("other", "hp")).toBe("other.hp")
    }
  }
]

const emCases: ExhaustiveCase[] = [
  {
    id: "EM-001",
    given: "payload number",
    when: "inferir tipus",
    expect: "valid number",
    run: () => {
      expect(inferPayloadType(10, baseContext)).toBe("number")
    }
  },
  {
    id: "EM-002",
    given: "payload string",
    when: "inferir tipus",
    expect: "valid string",
    run: () => {
      expect(inferPayloadType("event", baseContext)).toBe("string")
    }
  },
  {
    id: "EM-003",
    given: "payload boolean",
    when: "inferir tipus",
    expect: "valid boolean",
    run: () => {
      expect(inferPayloadType(true, baseContext)).toBe("boolean")
    }
  },
  {
    id: "EM-004",
    given: "payload globalVariable",
    when: "inferir tipus",
    expect: "tipus correcte",
    run: () => {
      expect(inferPayloadType({ source: "globalVariable", variableId: "gv-str" }, baseContext)).toBe("string")
    }
  },
  {
    id: "EM-005",
    given: "payload internalVariable other en collision",
    when: "inferir tipus",
    expect: "tipus correcte",
    run: () => {
      expect(inferPayloadType({ source: "internalVariable", target: "other", variableId: "ov-other-bool" }, baseContext)).toBe("boolean")
    }
  },
  {
    id: "EM-006",
    given: "canvi de tipus payload",
    when: "normalitzacio",
    expect: "autocorregeix valor default",
    run: () => {
      const draft: EmitPayloadDraft = {
        type: "emitCustomEvent",
        payload: { source: "literal", value: 5 }
      }
      const normalized = normalizeEmitPayloadDraft(draft, "string", baseContext)
      expect(normalized.payload).toEqual({ source: "literal", value: "" })
    }
  }
]

const rgCases: ExhaustiveCase[] = [
  {
    id: "RG-001",
    given: "target other al selector intern",
    when: "seleccio target-aware",
    expect: "mostra variables other",
    run: () => {
      const selected = selectTargetVariables({
        selfVariables: selfObjectVariables,
        otherVariables: otherObjectVariablesA,
        target: "other",
        allowOtherTarget: true
      })
      expect(selected.some((entry) => entry.id === "ov-other-num")).toBe(true)
    }
  },
  {
    id: "RG-002",
    given: "target seleccionat sense variables",
    when: "filtre target other buit",
    expect: "el selector pot renderitzar dash",
    run: () => {
      const selected = selectTargetVariables({
        selfVariables: selfObjectVariables,
        otherVariables: [],
        target: "other",
        allowOtherTarget: true
      })
      expect(selected).toEqual([])
    }
  },
  {
    id: "RG-003",
    given: "left IF amb variable other",
    when: "inferir tipus",
    expect: "tipus correcte variable other",
    run: () => {
      const type = resolveScalarType(
        { source: "internalVariable", target: "other", variableId: "ov-other-bool" },
        baseContext
      )
      expect(type).toBe("boolean")
    }
  },
  {
    id: "RG-004",
    given: "IF boolean",
    when: "operadors disponibles",
    expect: "sense comparadors numerics",
    run: () => {
      expect(getAllowedIfOperators("boolean")).toEqual(["==", "!="])
    }
  },
  {
    id: "RG-005",
    given: "VariablePicker self/other",
    when: "aplica filtre de target",
    expect: "filtra self/other correctament",
    run: () => {
      const selfSelected = selectTargetVariables({
        selfVariables: selfObjectVariables,
        otherVariables: otherObjectVariablesA,
        target: "self",
        allowOtherTarget: true
      })
      const otherSelected = selectTargetVariables({
        selfVariables: selfObjectVariables,
        otherVariables: otherObjectVariablesA,
        target: "other",
        allowOtherTarget: true
      })
      expect(selfSelected.some((entry) => entry.id === "ov-self-num")).toBe(true)
      expect(otherSelected.some((entry) => entry.id === "ov-self-num")).toBe(false)
    }
  },
  {
    id: "RG-006",
    given: "CollectionVariablePicker self/other",
    when: "aplica filtre de target",
    expect: "filtra self/other correctament",
    run: () => {
      const selfCollections = selfObjectVariables.filter((entry) => entry.type === "list")
      const otherCollections = otherObjectVariablesA.filter((entry) => entry.type === "list")
      const selected = selectTargetVariables({
        selfVariables: selfCollections,
        otherVariables: otherCollections,
        target: "other",
        allowOtherTarget: true
      })
      expect(selected.map((entry) => entry.id)).toContain("ov-other-list-num")
      expect(selected.map((entry) => entry.id)).not.toContain("ov-self-list-num")
    }
  },
  {
    id: "RG-007",
    given: "canvi de scope amb target other",
    when: "normalitzacio strict",
    expect: "preserva target i no forca self",
    run: () => {
      const draft: ChangeVariableDraft = {
        type: "changeVariable",
        scope: "global",
        variableId: "gv-num",
        operator: "set",
        value: { source: "literal", value: 1 },
        target: "other",
        targetInstanceId: null
      }
      expect(normalizeChangeVariableDraft(draft, baseContext).target).toBe("other")
    }
  },
  {
    id: "RG-008",
    given: "drafts normalitzats",
    when: "s'apliquen al runtime",
    expect: "no introdueixen regressions de contracte",
    run: () => {
      const normalized = normalizeCollectionActionDraft(
        {
          type: "listPush",
          scope: "object",
          variableId: "ov-other-list-num",
          value: { source: "literal", value: 3 },
          target: "other",
          targetInstanceId: null
        },
        baseContext
      )
      expect(normalized.type).toBe("listPush")
      expect(normalized.scope).toBe("object")
      expect(normalized.target).toBe("other")
    }
  }
]

const allCases = [
  ...srCases,
  ...ifOpCases,
  ...cvCases,
  ...clCases,
  ...vsCases,
  ...emCases,
  ...rgCases
]

describe("selector typing exhaustive matrix", () => {
  it("contains all exhaustive case IDs", () => {
    expect(allCases).toHaveLength(73)
    const ids = allCases.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(73)
  })

  it.each(allCases)("$id", (testCase) => {
    expect(testCase.given.length).toBeGreaterThan(0)
    expect(testCase.when.length).toBeGreaterThan(0)
    expect(testCase.expect.length).toBeGreaterThan(0)
    testCase.run()
  })

  it("sanity checks helper compatibility APIs", () => {
    expect(getFirstCompatibleObjectVariableId("gv-num", baseContext, "self")).toBe("ov-self-num")
    expect(getFirstCompatibleGlobalVariableId("ov-self-str", baseContext, "self")).toBe("gv-str")
    expect(getDefaultValueExpressionForType("boolean")).toEqual({ source: "literal", value: false })
  })
})
