import type { ProjectV1, ValueExpressionOutput, ObjectControlBlockItem } from "./schema-v1.js"
import { generateUUID } from "./generate-id.js"

export type CreateObjectInput = {
  name: string
  folderId?: string | null
  spriteId?: string | null
  x?: number
  y?: number
  speed?: number
  direction?: number
  width?: number
  height?: number
  visible?: boolean
  solid?: boolean
}

const DEFAULT_SPRITE_SIZE = 32
const DEFAULT_ROOM_WIDTH = 832
const DEFAULT_ROOM_HEIGHT = 480
const TRANSPARENT_RGBA = "#00000000"

export type AddRoomInstanceInput = {
  roomId: string
  objectId: string
  x: number
  y: number
}

export type MoveRoomInstanceInput = {
  roomId: string
  instanceId: string
  x: number
  y: number
}

export type UpdateObjectPropertiesInput = {
  objectId: string
  x: number
  y: number
  speed: number
  direction: number
  width: number
  height: number
  visible: boolean
  solid: boolean
}

export type ObjectEventType =
  | "Create"
  | "Step"
  | "Collision"
  | "Keyboard"
  | "Mouse"
  | "OnDestroy"
  | "OutsideRoom"
  | "MouseMove"
  | "Timer"
  | "CustomEvent"
export type ObjectEventKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Space" | "<any>"
export type ObjectKeyboardMode = "down" | "press" | "release"
export type ObjectMouseMode = "down" | "press"
export type ObjectEventItem = ProjectV1["objects"][number]["events"][number]["items"][number]
export type ObjectAction = Extract<ObjectEventItem, { type: "action" }>["action"]
export type ObjectIfBlock = Extract<ObjectEventItem, { type: "if" }>
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
export type ObjectActionDraft = DistributiveOmit<ObjectAction, "id">
export type IfCondition = Extract<ObjectEventItem, { type: "if" }>["condition"]
export type VariableDefinition = ProjectV1["variables"]["global"][number]
export type VariableType = VariableDefinition["type"]
export type VariableValue = VariableDefinition["initialValue"]
export type VariableItemType = "number" | "string" | "boolean"
export type ValueExpression = ValueExpressionOutput
export type SpriteFolder = NonNullable<ProjectV1["resources"]["spriteFolders"]>[number]
export type ObjectFolder = NonNullable<ProjectV1["resources"]["objectFolders"]>[number]
export type RoomFolder = NonNullable<ProjectV1["resources"]["roomFolders"]>[number]
export type RoomEntry = ProjectV1["rooms"][number]
export type SpriteResource = ProjectV1["resources"]["sprites"][number]

export type AddObjectEventInput = {
  objectId: string
  type: ObjectEventType
  key?: ObjectEventKey | null
  keyboardMode?: ObjectKeyboardMode | null
  mouseMode?: ObjectMouseMode | null
  targetObjectId?: string | null
  intervalMs?: number | null
  eventName?: string | null
  sourceObjectId?: string | null
}

export type RemoveObjectEventInput = {
  objectId: string
  eventId: string
}

export type DuplicateObjectEventInput = {
  objectId: string
  eventId: string
}

export type AddObjectEventActionInput = {
  objectId: string
  eventId: string
  action: ObjectActionDraft
}

export type UpdateObjectEventActionInput = {
  objectId: string
  eventId: string
  actionId: string
  action: ObjectActionDraft
}

export type RemoveObjectEventActionInput = {
  objectId: string
  eventId: string
  actionId: string
}

export type MoveObjectEventActionInput = {
  objectId: string
  eventId: string
  actionId: string
  direction: "up" | "down"
}

export type MoveObjectEventItemInput = {
  objectId: string
  eventId: string
  actionId: string
  targetIfBlockId?: string
  targetBranch?: "then" | "else"
  targetActionId?: string
  position?: "top" | "bottom"
}

export type InsertObjectEventItemInput = {
  objectId: string
  eventId: string
  item: ObjectEventItem
  afterItemId?: string
}

export type AddObjectEventIfBlockInput = {
  objectId: string
  eventId: string
  condition: IfCondition
  parentIfBlockId?: string
  parentBranch?: "then" | "else"
}

export type UpdateObjectEventIfBlockConditionInput = {
  objectId: string
  eventId: string
  ifBlockId: string
  condition: IfCondition
}

export type RemoveObjectEventIfBlockInput = {
  objectId: string
  eventId: string
  ifBlockId: string
}

export type AddObjectEventIfActionInput = {
  objectId: string
  eventId: string
  ifBlockId: string
  branch?: "then" | "else"
  action: ObjectActionDraft
}

export type UpdateObjectEventIfActionInput = {
  objectId: string
  eventId: string
  ifBlockId: string
  branch?: "then" | "else"
  actionId: string
  action: ObjectActionDraft
}

export type RemoveObjectEventIfActionInput = {
  objectId: string
  eventId: string
  ifBlockId: string
  branch?: "then" | "else"
  actionId: string
}

export type UpdateObjectEventConfigInput = {
  objectId: string
  eventId: string
  key?: ObjectEventKey | null
  keyboardMode?: ObjectKeyboardMode | null
  mouseMode?: ObjectMouseMode | null
  targetObjectId?: string | null
  intervalMs?: number | null
  eventName?: string | null
  sourceObjectId?: string | null
}

export type AddGlobalVariableInput = {
  name: string
  type: VariableType
  initialValue: VariableValue
  itemType?: VariableItemType
}

export type UpdateGlobalVariableInput = {
  variableId: string
  name: string
  initialValue: VariableValue
}

export type RemoveGlobalVariableInput = {
  variableId: string
}

export type AddObjectVariableInput = {
  objectId: string
  name: string
  type: VariableType
  initialValue: VariableValue
  itemType?: VariableItemType
}

export type UpdateObjectVariableInput = {
  objectId: string
  variableId: string
  name: string
  initialValue: VariableValue
}

export type RemoveObjectVariableInput = {
  objectId: string
  variableId: string
}

function makeId(prefix: string): string {
  return `${prefix}-${generateUUID()}`
}

function normalizeSpriteDimension(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SPRITE_SIZE
  }
  return Math.max(1, Math.round(value))
}

function normalizeRoomDimension(value: number, min: number): number {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.max(min, Math.round(value))
}

function resolveRoomDimension(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }
  return Math.max(fallback, Math.round(value))
}

function createTransparentPixels(width: number, height: number): string[] {
  return Array.from({ length: width * height }, () => TRANSPARENT_RGBA)
}

function normalizeSpritePixels(width: number, height: number, pixels: string[]): string[] {
  const total = width * height
  if (pixels.length === total) {
    return [...pixels]
  }
  const next = pixels.slice(0, total)
  while (next.length < total) {
    next.push(TRANSPARENT_RGBA)
  }
  return next
}

function toActionItem(action: ObjectActionDraft): Extract<ObjectEventItem, { type: "action" }> {
  const actionId = makeId("action")
  return {
    id: makeId("item"),
    type: "action",
    action: { id: actionId, ...action } as ObjectAction
  }
}

function getBlockBranches(item: ObjectEventItem): ObjectEventItem[][] {
  if (item.type === "if") return [item.thenActions, item.elseActions]
  if (item.type === "repeat" || item.type === "forEachList" || item.type === "forEachMap") return [item.actions]
  return []
}

function isControlBlock(item: ObjectEventItem): boolean {
  return item.type === "if" || item.type === "repeat" || item.type === "forEachList" || item.type === "forEachMap"
}

function withUpdatedBranches(item: ObjectEventItem, branches: ObjectEventItem[][]): ObjectEventItem {
  if (item.type === "if") {
    return { ...item, thenActions: branches[0] ?? [], elseActions: branches[1] ?? [] }
  }
  if (item.type === "repeat" || item.type === "forEachList" || item.type === "forEachMap") {
    return { ...item, actions: branches[0] ?? [] }
  }
  return item
}

function updateBlockInItems(
  items: ObjectEventItem[],
  blockId: string,
  updater: (block: ObjectEventItem) => ObjectEventItem
): { items: ObjectEventItem[]; updated: boolean } {
  let updated = false
  const nextItems = items.map((itemEntry) => {
    if (!isControlBlock(itemEntry)) {
      return itemEntry
    }
    if (itemEntry.id === blockId) {
      updated = true
      return updater(itemEntry)
    }
    const branches = getBlockBranches(itemEntry)
    const branchResults = branches.map((branch) => updateBlockInItems(branch, blockId, updater))
    if (!branchResults.some((result) => result.updated)) {
      return itemEntry
    }
    updated = true
    return withUpdatedBranches(
      itemEntry,
      branchResults.map((result) => result.items)
    )
  })
  return { items: nextItems, updated }
}

function updateIfBlockInItems(
  items: ObjectEventItem[],
  ifBlockId: string,
  updater: (ifBlock: ObjectIfBlock) => ObjectIfBlock
): { items: ObjectEventItem[]; updated: boolean } {
  return updateBlockInItems(items, ifBlockId, (block) => updater(block as ObjectIfBlock))
}

function removeBlockFromItems(
  items: ObjectEventItem[],
  blockId: string
): { items: ObjectEventItem[]; updated: boolean } {
  let updated = false
  const nextItems: ObjectEventItem[] = []
  for (const itemEntry of items) {
    if (!isControlBlock(itemEntry)) {
      nextItems.push(itemEntry)
      continue
    }
    if (itemEntry.id === blockId) {
      updated = true
      continue
    }
    const branches = getBlockBranches(itemEntry)
    const branchResults = branches.map((branch) => removeBlockFromItems(branch, blockId))
    if (branchResults.some((result) => result.updated)) {
      updated = true
      nextItems.push(withUpdatedBranches(itemEntry, branchResults.map((r) => r.items)))
      continue
    }
    nextItems.push(itemEntry)
  }
  return { items: nextItems, updated }
}

function removeIfBlockFromItems(
  items: ObjectEventItem[],
  ifBlockId: string
): { items: ObjectEventItem[]; updated: boolean } {
  return removeBlockFromItems(items, ifBlockId)
}

function moveActionInItems(
  items: ObjectEventItem[],
  actionId: string,
  direction: "up" | "down"
): { items: ObjectEventItem[]; updated: boolean } {
  const actionIndex = items.findIndex((itemEntry) => itemEntry.type === "action" && itemEntry.action.id === actionId)
  if (actionIndex >= 0) {
    const targetIndex = direction === "up" ? actionIndex - 1 : actionIndex + 1
    if (targetIndex < 0 || targetIndex >= items.length) {
      return { items, updated: false }
    }
    const reordered = [...items]
    const [moved] = reordered.splice(actionIndex, 1)
    if (!moved) {
      return { items, updated: false }
    }
    reordered.splice(targetIndex, 0, moved)
    return { items: reordered, updated: true }
  }

  let updated = false
  const nextItems = items.map((itemEntry) => {
    if (!isControlBlock(itemEntry) || updated) {
      return itemEntry
    }
    const branches = getBlockBranches(itemEntry)
    for (let branchIndex = 0; branchIndex < branches.length; branchIndex++) {
      const branchResult = moveActionInItems(branches[branchIndex]!, actionId, direction)
      if (branchResult.updated) {
        updated = true
        const updatedBranches = branches.map((b, i) => (i === branchIndex ? branchResult.items : b))
        return withUpdatedBranches(itemEntry, updatedBranches)
      }
    }
    return itemEntry
  })
  return { items: nextItems, updated }
}

function removeActionItemFromItems(
  items: ObjectEventItem[],
  actionId: string
): {
  items: ObjectEventItem[]
  removedItem: Extract<ObjectEventItem, { type: "action" }> | null
  removed: boolean
} {
  let removedItem: Extract<ObjectEventItem, { type: "action" }> | null = null
  const nextItems: ObjectEventItem[] = []
  for (const itemEntry of items) {
    if (!removedItem && itemEntry.type === "action" && itemEntry.action.id === actionId) {
      removedItem = itemEntry
      continue
    }
    if (!removedItem && isControlBlock(itemEntry)) {
      const branches = getBlockBranches(itemEntry)
      let found = false
      const updatedBranches: ObjectEventItem[][] = []
      for (const branch of branches) {
        if (found) {
          updatedBranches.push(branch)
          continue
        }
        const branchResult = removeActionItemFromItems(branch, actionId)
        if (branchResult.removed) {
          removedItem = branchResult.removedItem
          found = true
          updatedBranches.push(branchResult.items)
        } else {
          updatedBranches.push(branch)
        }
      }
      if (found) {
        nextItems.push(withUpdatedBranches(itemEntry, updatedBranches))
        continue
      }
    }
    nextItems.push(itemEntry)
  }
  return {
    items: removedItem ? nextItems : items,
    removedItem,
    removed: removedItem !== null
  }
}

function insertActionItemInContainer(
  items: ObjectEventItem[],
  item: Extract<ObjectEventItem, { type: "action" }>,
  targetActionId?: string,
  position: "top" | "bottom" = "bottom"
): { items: ObjectEventItem[]; inserted: boolean } {
  if (!targetActionId) {
    return {
      items: [...items, item],
      inserted: true
    }
  }
  const targetIndex = items.findIndex((entry) => entry.type === "action" && entry.action.id === targetActionId)
  if (targetIndex < 0) {
    return { items, inserted: false }
  }
  const insertIndex = position === "top" ? targetIndex : targetIndex + 1
  const nextItems = [...items]
  nextItems.splice(insertIndex, 0, item)
  return {
    items: nextItems,
    inserted: true
  }
}

function insertActionItemIntoItems(
  items: ObjectEventItem[],
  input: {
    item: Extract<ObjectEventItem, { type: "action" }>
    targetIfBlockId?: string
    targetBranch: "then" | "else"
    targetActionId?: string
    position: "top" | "bottom"
  }
): { items: ObjectEventItem[]; inserted: boolean } {
  if (!input.targetIfBlockId) {
    return insertActionItemInContainer(items, input.item, input.targetActionId, input.position)
  }
  let inserted = false
  const nextItems = items.map((itemEntry) => {
    if (!isControlBlock(itemEntry) || inserted) {
      return itemEntry
    }
    if (itemEntry.id === input.targetIfBlockId) {
      const branches = getBlockBranches(itemEntry)
      const branchIndex = input.targetBranch === "else" ? 1 : 0
      const targetContainer = branches[branchIndex]
      if (!targetContainer) return itemEntry
      const insertionResult = insertActionItemInContainer(targetContainer, input.item, input.targetActionId, input.position)
      if (!insertionResult.inserted) {
        return itemEntry
      }
      inserted = true
      const updatedBranches = branches.map((b, i) => (i === branchIndex ? insertionResult.items : b))
      return withUpdatedBranches(itemEntry, updatedBranches)
    }
    const branches = getBlockBranches(itemEntry)
    for (let branchIdx = 0; branchIdx < branches.length; branchIdx++) {
      const branchResult = insertActionItemIntoItems(branches[branchIdx]!, input)
      if (branchResult.inserted) {
        inserted = true
        const updatedBranches = branches.map((b, i) => (i === branchIdx ? branchResult.items : b))
        return withUpdatedBranches(itemEntry, updatedBranches)
      }
    }
    return itemEntry
  })
  return { items: inserted ? nextItems : items, inserted }
}

function cloneIfCondition(condition: IfCondition): IfCondition {
  if ("left" in condition) {
    return {
      left: { ...condition.left },
      operator: condition.operator,
      right: JSON.parse(JSON.stringify(condition.right)) as ValueExpression
    }
  }
  return {
    logic: condition.logic,
    conditions: condition.conditions.map((nestedCondition) => cloneIfCondition(nestedCondition))
  }
}

function insertEventItemAfterItemInItems(
  items: ObjectEventItem[],
  anchorItemId: string,
  item: ObjectEventItem
): { items: ObjectEventItem[]; inserted: boolean } {
  const directActionIndex = items.findIndex(
    (entry) =>
      entry.id === anchorItemId ||
      (entry.type === "action" && entry.action.id === anchorItemId)
  )
  if (directActionIndex >= 0) {
    const nextItems = [...items]
    nextItems.splice(directActionIndex + 1, 0, item)
    return { items: nextItems, inserted: true }
  }

  let inserted = false
  const nextItems = items.map((entry) => {
    if (!isControlBlock(entry) || inserted) {
      return entry
    }
    const branches = getBlockBranches(entry)
    for (let branchIdx = 0; branchIdx < branches.length; branchIdx++) {
      const branchResult = insertEventItemAfterItemInItems(branches[branchIdx]!, anchorItemId, item)
      if (branchResult.inserted) {
        inserted = true
        const updatedBranches = branches.map((b, i) => (i === branchIdx ? branchResult.items : b))
        return withUpdatedBranches(entry, updatedBranches)
      }
    }
    return entry
  })
  return { items: nextItems, inserted }
}

function normalizeVariableName(name: string): string {
  return name.trim().toLocaleLowerCase()
}

function normalizeSpriteName(name: string): string {
  return name.trim().toLocaleLowerCase()
}

function hasSpriteNameConflict(
  sprites: SpriteResource[],
  folderId: string | null,
  candidateName: string,
  ignoreSpriteId?: string
): boolean {
  const normalizedCandidate = normalizeSpriteName(candidateName)
  return sprites.some(
    (spriteEntry) =>
      spriteEntry.id !== ignoreSpriteId &&
      (spriteEntry.folderId ?? null) === folderId &&
      normalizeSpriteName(spriteEntry.name) === normalizedCandidate
  )
}

function hasFolderNameConflict(
  folders: { id: string; name: string; parentId?: string | null | undefined }[],
  parentId: string | null,
  candidateName: string,
  ignoreFolderId?: string
): boolean {
  const normalizedCandidate = normalizeSpriteName(candidateName)
  return folders.some(
    (folderEntry) =>
      folderEntry.id !== ignoreFolderId &&
      (folderEntry.parentId ?? null) === parentId &&
      normalizeSpriteName(folderEntry.name) === normalizedCandidate
  )
}

function getSpriteFolders(project: ProjectV1): SpriteFolder[] {
  return project.resources.spriteFolders ?? []
}

function getObjectFolders(project: ProjectV1): ObjectFolder[] {
  return project.resources.objectFolders ?? []
}

function getRoomFolders(project: ProjectV1): RoomFolder[] {
  return project.resources.roomFolders ?? []
}

function hasVariableNameConflict(definitions: VariableDefinition[], candidateName: string, ignoreId?: string): boolean {
  const normalizedCandidate = normalizeVariableName(candidateName)
  return definitions.some(
    (definition) => definition.id !== ignoreId && normalizeVariableName(definition.name) === normalizedCandidate
  )
}

function buildVariableDefinition(input: {
  id: string
  name: string
  type: VariableType
  initialValue: VariableValue
  itemType?: VariableItemType
}): VariableDefinition {
  if (input.type === "number") {
    return {
      id: input.id,
      name: input.name,
      type: "number",
      initialValue: typeof input.initialValue === "number" ? input.initialValue : 0
    }
  }
  if (input.type === "string") {
    return {
      id: input.id,
      name: input.name,
      type: "string",
      initialValue: typeof input.initialValue === "string" ? input.initialValue : ""
    }
  }
  if (input.type === "boolean") {
    return {
      id: input.id,
      name: input.name,
      type: "boolean",
      initialValue: typeof input.initialValue === "boolean" ? input.initialValue : false
    }
  }
  if (input.type === "list") {
    const itemType = input.itemType ?? "number"
    const listValue = Array.isArray(input.initialValue)
      ? input.initialValue.filter((entry): entry is number | string | boolean => typeof entry === itemType)
      : []
    return {
      id: input.id,
      name: input.name,
      type: "list",
      itemType,
      initialValue: listValue
    }
  }
  const itemType = input.itemType ?? "number"
  const mapValue =
    input.initialValue && typeof input.initialValue === "object" && !Array.isArray(input.initialValue)
      ? Object.fromEntries(
          Object.entries(input.initialValue as Record<string, unknown>).filter(([, value]) => typeof value === itemType)
        ) as Record<string, string | number | boolean>
      : ({} as Record<string, string | number | boolean>)
  return {
    id: input.id,
    name: input.name,
    type: "map",
    itemType,
    initialValue: mapValue
  }
}

export function quickCreateSprite(
  project: ProjectV1,
  name: string
): { project: ProjectV1; spriteId: string } {
  return quickCreateSpriteWithSize(project, name, DEFAULT_SPRITE_SIZE, DEFAULT_SPRITE_SIZE)
}

export function quickCreateSpriteWithSize(
  project: ProjectV1,
  name: string,
  width: number,
  height: number
): { project: ProjectV1; spriteId: string } {
  const spriteId = makeId("sprite")
  const normalizedWidth = normalizeSpriteDimension(width)
  const normalizedHeight = normalizeSpriteDimension(height)
  const initialPixels = createTransparentPixels(normalizedWidth, normalizedHeight)
  return {
    project: {
      ...project,
      resources: {
        ...project.resources,
        sprites: [
          ...project.resources.sprites,
          {
            id: spriteId,
            name,
            folderId: null,
            imagePath: "",
            assetSource: "",
            uploadStatus: "notConnected",
            width: normalizedWidth,
            height: normalizedHeight,
            pixelsRgba: initialPixels,
            frames: [{ id: makeId("frame"), pixelsRgba: [...initialPixels] }]
          }
        ]
      }
    },
    spriteId
  }
}

export function duplicateSprite(
  project: ProjectV1,
  spriteId: string
): { project: ProjectV1; spriteId: string } | null {
  const source = project.resources.sprites.find((entry) => entry.id === spriteId)
  if (!source) return null
  const newSpriteId = makeId("sprite")
  return {
    project: {
      ...project,
      resources: {
        ...project.resources,
        sprites: [
          ...project.resources.sprites,
          {
            id: newSpriteId,
            name: `${source.name} (copy)`,
            folderId: source.folderId,
            imagePath: "",
            assetSource: source.assetSource,
            uploadStatus: source.uploadStatus,
            width: source.width,
            height: source.height,
            pixelsRgba: [...source.pixelsRgba],
            frames: source.frames.map((f) => ({ id: makeId("frame"), pixelsRgba: [...f.pixelsRgba] }))
          }
        ]
      }
    },
    spriteId: newSpriteId
  }
}

export function quickCreateSound(
  project: ProjectV1,
  name: string
): { project: ProjectV1; soundId: string } {
  const soundId = makeId("sound")
  return {
    project: {
      ...project,
      resources: {
        ...project.resources,
        sounds: [
          ...project.resources.sounds,
          { id: soundId, name, audioPath: "", assetSource: "", uploadStatus: "notConnected" }
        ]
      }
    },
    soundId
  }
}

export function quickCreateObject(
  project: ProjectV1,
  input: CreateObjectInput
): { project: ProjectV1; objectId: string } {
  const objectId = makeId("object")
  return {
    project: {
      ...project,
      objects: [
        ...project.objects,
        {
          id: objectId,
          name: input.name,
          folderId: input.folderId ?? null,
          spriteId: input.spriteId ?? null,
          x: input.x ?? 0,
          y: input.y ?? 0,
          speed: input.speed ?? 0,
          direction: input.direction ?? 0,
          width: input.width ?? 32,
          height: input.height ?? 32,
          visible: input.visible ?? true,
          solid: input.solid ?? false,
          events: []
        }
      ]
    },
    objectId
  }
}

export function createRoom(
  project: ProjectV1,
  name: string,
  folderId: string | null = null
): { project: ProjectV1; roomId: string } {
  const roomId = makeId("room")
  return {
    project: {
      ...project,
      rooms: [
        ...project.rooms,
        {
          id: roomId,
          name,
          folderId: folderId ?? null,
          width: DEFAULT_ROOM_WIDTH,
          height: DEFAULT_ROOM_HEIGHT,
          instances: []
        }
      ]
    },
    roomId
  }
}

export function updateObjectProperties(
  project: ProjectV1,
  input: UpdateObjectPropertiesInput
): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            x: input.x,
            y: input.y,
            speed: input.speed,
            direction: input.direction,
            width: input.width,
            height: input.height,
            visible: input.visible,
            solid: input.solid
          }
        : objectEntry
    )
  }
}

export function addRoomInstance(
  project: ProjectV1,
  input: AddRoomInstanceInput
): { project: ProjectV1; instanceId: string } {
  const instanceId = makeId("instance")
  return {
    project: {
      ...project,
      rooms: project.rooms.map((room) =>
        room.id === input.roomId
          ? {
              ...room,
              instances: [
                ...room.instances,
                { id: instanceId, objectId: input.objectId, x: input.x, y: input.y }
              ]
            }
          : room
      )
    },
    instanceId
  }
}

export function updateSpriteAssetSource(project: ProjectV1, spriteId: string, assetSource: string): ProjectV1 {
  return {
    ...project,
    resources: {
      ...project.resources,
      sprites: project.resources.sprites.map((spriteEntry) =>
        spriteEntry.id === spriteId
          ? {
              ...spriteEntry,
              assetSource,
              uploadStatus: assetSource.trim() ? "ready" : "notConnected"
            }
          : spriteEntry
      )
    }
  }
}

export function createSpriteFolder(
  project: ProjectV1,
  name: string,
  parentId: string | null = null
): { project: ProjectV1; folderId: string | null } {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return { project, folderId: null }
  }
  const normalizedParentId = parentId ?? null
  const spriteFolders = getSpriteFolders(project)
  if (normalizedParentId && !spriteFolders.some((entry) => entry.id === normalizedParentId)) {
    return { project, folderId: null }
  }
  if (hasFolderNameConflict(spriteFolders, normalizedParentId, trimmedName)) {
    return { project, folderId: null }
  }
  const folderId = makeId("sprite-folder")
  return {
    project: {
      ...project,
      resources: {
        ...project.resources,
        spriteFolders: [
          ...spriteFolders,
          {
            id: folderId,
            name: trimmedName,
            parentId: normalizedParentId
          }
        ]
      }
    },
    folderId
  }
}

export function renameSpriteFolder(project: ProjectV1, folderId: string, name: string): ProjectV1 {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return project
  }
  const spriteFolders = getSpriteFolders(project)
  const folderEntry = spriteFolders.find((entry) => entry.id === folderId)
  if (!folderEntry) {
    return project
  }
  const parentId = folderEntry.parentId ?? null
  if (hasFolderNameConflict(spriteFolders, parentId, trimmedName, folderId)) {
    return project
  }
  return {
    ...project,
    resources: {
      ...project.resources,
      spriteFolders: spriteFolders.map((entry) =>
        entry.id === folderId
          ? {
              ...entry,
              name: trimmedName
            }
          : entry
      )
    }
  }
}

export function deleteSpriteFolder(project: ProjectV1, folderId: string): ProjectV1 {
  const folders = getSpriteFolders(project)
  const hasFolder = folders.some((entry) => entry.id === folderId)
  if (!hasFolder) {
    return project
  }
  const deletedBranchIds = new Set<string>([folderId])
  let hasNewDescendants = true
  while (hasNewDescendants) {
    hasNewDescendants = false
    for (const folderEntry of folders) {
      if (folderEntry.parentId && deletedBranchIds.has(folderEntry.parentId) && !deletedBranchIds.has(folderEntry.id)) {
        deletedBranchIds.add(folderEntry.id)
        hasNewDescendants = true
      }
    }
  }

  const deletedSpriteIds = new Set(
    project.resources.sprites
      .filter((entry) => entry.folderId && deletedBranchIds.has(entry.folderId))
      .map((entry) => entry.id)
  )

  return {
    ...project,
    resources: {
      ...project.resources,
      spriteFolders: folders.filter((entry) => !deletedBranchIds.has(entry.id)),
      sprites: project.resources.sprites.filter((entry) => !deletedSpriteIds.has(entry.id))
    },
    objects: project.objects.map((entry) =>
      entry.spriteId && deletedSpriteIds.has(entry.spriteId)
        ? { ...entry, spriteId: null }
        : entry
    )
  }
}

export function renameSprite(project: ProjectV1, spriteId: string, name: string): ProjectV1 {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return project
  }
  const currentSprite = project.resources.sprites.find((entry) => entry.id === spriteId)
  if (!currentSprite) {
    return project
  }
  const folderId = currentSprite.folderId ?? null
  if (hasSpriteNameConflict(project.resources.sprites, folderId, trimmedName, spriteId)) {
    return project
  }
  return {
    ...project,
    resources: {
      ...project.resources,
      sprites: project.resources.sprites.map((entry) =>
        entry.id === spriteId
          ? {
              ...entry,
              name: trimmedName
            }
          : entry
      )
    }
  }
}

export function moveSpriteFolder(project: ProjectV1, folderId: string, newParentId: string | null): ProjectV1 {
  const spriteFolders = getSpriteFolders(project)
  const normalizedParent = newParentId ?? null
  const folderEntry = spriteFolders.find((entry) => entry.id === folderId)
  if (!folderEntry) {
    return project
  }
  if ((folderEntry.parentId ?? null) === normalizedParent) {
    return project
  }
  if (normalizedParent && !spriteFolders.some((entry) => entry.id === normalizedParent)) {
    return project
  }
  if (normalizedParent) {
    const ancestors = new Set<string>()
    let current: string | null = normalizedParent
    while (current) {
      if (current === folderId) {
        return project
      }
      if (ancestors.has(current)) {
        break
      }
      ancestors.add(current)
      const parent = spriteFolders.find((entry) => entry.id === current)
      current = parent?.parentId ?? null
    }
  }
  return {
    ...project,
    resources: {
      ...project.resources,
      spriteFolders: spriteFolders.map((entry) =>
        entry.id === folderId
          ? {
              ...entry,
              parentId: normalizedParent
            }
          : entry
      )
    }
  }
}

export function moveSpriteToFolder(project: ProjectV1, spriteId: string, folderId: string | null): ProjectV1 {
  const normalizedFolderId = folderId ?? null
  const hasSprite = project.resources.sprites.some((entry) => entry.id === spriteId)
  if (!hasSprite) {
    return project
  }
  const spriteFolders = getSpriteFolders(project)
  if (normalizedFolderId && !spriteFolders.some((entry) => entry.id === normalizedFolderId)) {
    return project
  }
  return {
    ...project,
    resources: {
      ...project.resources,
      sprites: project.resources.sprites.map((entry) =>
        entry.id === spriteId
          ? {
              ...entry,
              folderId: normalizedFolderId
            }
          : entry
      )
    }
  }
}

export function createObjectFolder(
  project: ProjectV1,
  name: string,
  parentId: string | null = null
): { project: ProjectV1; folderId: string | null } {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return { project, folderId: null }
  }
  const normalizedParentId = parentId ?? null
  const objectFolders = getObjectFolders(project)
  if (normalizedParentId && !objectFolders.some((entry) => entry.id === normalizedParentId)) {
    return { project, folderId: null }
  }
  if (hasFolderNameConflict(objectFolders, normalizedParentId, trimmedName)) {
    return { project, folderId: null }
  }
  const folderId = makeId("object-folder")
  return {
    project: {
      ...project,
      resources: {
        ...project.resources,
        objectFolders: [
          ...objectFolders,
          {
            id: folderId,
            name: trimmedName,
            parentId: normalizedParentId
          }
        ]
      }
    },
    folderId
  }
}

export function renameObjectFolder(project: ProjectV1, folderId: string, name: string): ProjectV1 {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return project
  }
  const objectFolders = getObjectFolders(project)
  const folderEntry = objectFolders.find((entry) => entry.id === folderId)
  if (!folderEntry) {
    return project
  }
  const parentId = folderEntry.parentId ?? null
  if (hasFolderNameConflict(objectFolders, parentId, trimmedName, folderId)) {
    return project
  }
  return {
    ...project,
    resources: {
      ...project.resources,
      objectFolders: objectFolders.map((entry) =>
        entry.id === folderId
          ? {
              ...entry,
              name: trimmedName
            }
          : entry
      )
    }
  }
}

export function moveObjectFolder(project: ProjectV1, folderId: string, newParentId: string | null): ProjectV1 {
  const objectFolders = getObjectFolders(project)
  const normalizedParent = newParentId ?? null
  const folderEntry = objectFolders.find((entry) => entry.id === folderId)
  if (!folderEntry) {
    return project
  }
  if ((folderEntry.parentId ?? null) === normalizedParent) {
    return project
  }
  if (normalizedParent && !objectFolders.some((entry) => entry.id === normalizedParent)) {
    return project
  }
  if (normalizedParent) {
    const ancestors = new Set<string>()
    let current: string | null = normalizedParent
    while (current) {
      if (current === folderId) {
        return project
      }
      if (ancestors.has(current)) {
        break
      }
      ancestors.add(current)
      const parent = objectFolders.find((entry) => entry.id === current)
      current = parent?.parentId ?? null
    }
  }
  return {
    ...project,
    resources: {
      ...project.resources,
      objectFolders: objectFolders.map((entry) =>
        entry.id === folderId
          ? {
              ...entry,
              parentId: normalizedParent
            }
          : entry
      )
    }
  }
}

export function moveObjectToFolder(project: ProjectV1, objectId: string, folderId: string | null): ProjectV1 {
  const normalizedFolderId = folderId ?? null
  const hasObject = project.objects.some((entry) => entry.id === objectId)
  if (!hasObject) {
    return project
  }
  const objectFolders = getObjectFolders(project)
  if (normalizedFolderId && !objectFolders.some((entry) => entry.id === normalizedFolderId)) {
    return project
  }
  return {
    ...project,
    objects: project.objects.map((entry) =>
      entry.id === objectId
        ? {
            ...entry,
            folderId: normalizedFolderId
          }
        : entry
    )
  }
}

export function deleteObjectFolder(project: ProjectV1, folderId: string): ProjectV1 {
  const objectFolders = getObjectFolders(project)
  const hasFolder = objectFolders.some((entry) => entry.id === folderId)
  if (!hasFolder) {
    return project
  }
  const deletedBranchIds = new Set<string>([folderId])
  let hasNewDescendants = true
  while (hasNewDescendants) {
    hasNewDescendants = false
    for (const folderEntry of objectFolders) {
      if (folderEntry.parentId && deletedBranchIds.has(folderEntry.parentId) && !deletedBranchIds.has(folderEntry.id)) {
        deletedBranchIds.add(folderEntry.id)
        hasNewDescendants = true
      }
    }
  }

  const deletedObjectIds = new Set(
    project.objects
      .filter((entry) => entry.folderId && deletedBranchIds.has(entry.folderId))
      .map((entry) => entry.id)
  )
  const remainingObjects = project.objects.filter((entry) => !deletedObjectIds.has(entry.id))

  return {
    ...project,
    resources: {
      ...project.resources,
      objectFolders: objectFolders.filter((entry) => !deletedBranchIds.has(entry.id))
    },
    objects: remainingObjects,
    rooms: project.rooms.map((roomEntry) => ({
      ...roomEntry,
      instances: roomEntry.instances.filter((instanceEntry) => !deletedObjectIds.has(instanceEntry.objectId))
    })),
    variables: {
      ...project.variables,
      objectByObjectId: Object.fromEntries(
        Object.entries(project.variables.objectByObjectId).filter(([objectId]) => !deletedObjectIds.has(objectId))
      )
    }
  }
}

export function deleteSprite(project: ProjectV1, spriteId: string): ProjectV1 {
  const hasSprite = project.resources.sprites.some((entry) => entry.id === spriteId)
  if (!hasSprite) {
    return project
  }
  return {
    ...project,
    resources: {
      ...project.resources,
      sprites: project.resources.sprites.filter((entry) => entry.id !== spriteId)
    },
    objects: project.objects.map((objectEntry) =>
      objectEntry.spriteId === spriteId
        ? {
            ...objectEntry,
            spriteId: null
          }
        : objectEntry
    )
  }
}

export type SpriteFrame = NonNullable<ProjectV1["resources"]["sprites"][number]["frames"]>[number]

function getSpriteFrames(sprite: SpriteResource): SpriteFrame[] {
  return sprite.frames
}

function syncPixelsRgbaWithFrame0(sprite: SpriteResource): SpriteResource {
  const firstFrame = sprite.frames[0]
  if (!firstFrame) return sprite
  return { ...sprite, pixelsRgba: firstFrame.pixelsRgba }
}

export function addSpriteFrame(
  project: ProjectV1,
  spriteId: string,
  afterFrameId?: string
): { project: ProjectV1; frameId: string } | null {
  const sprite = project.resources.sprites.find((entry) => entry.id === spriteId)
  if (!sprite) return null
  const frameId = makeId("frame")
  const width = normalizeSpriteDimension(sprite.width)
  const height = normalizeSpriteDimension(sprite.height)
  const newFrame: SpriteFrame = { id: frameId, pixelsRgba: createTransparentPixels(width, height) }
  const frames = getSpriteFrames(sprite)
  let nextFrames: SpriteFrame[]
  if (afterFrameId) {
    const afterIndex = frames.findIndex((f) => f.id === afterFrameId)
    if (afterIndex >= 0) {
      nextFrames = [...frames.slice(0, afterIndex + 1), newFrame, ...frames.slice(afterIndex + 1)]
    } else {
      nextFrames = [...frames, newFrame]
    }
  } else {
    nextFrames = [...frames, newFrame]
  }
  const updatedSprite = syncPixelsRgbaWithFrame0({ ...sprite, frames: nextFrames })
  return {
    project: {
      ...project,
      resources: {
        ...project.resources,
        sprites: project.resources.sprites.map((entry) => (entry.id === spriteId ? updatedSprite : entry))
      }
    },
    frameId
  }
}

export function duplicateSpriteFrame(
  project: ProjectV1,
  spriteId: string,
  frameId: string
): { project: ProjectV1; frameId: string } | null {
  const sprite = project.resources.sprites.find((entry) => entry.id === spriteId)
  if (!sprite) return null
  const frames = getSpriteFrames(sprite)
  const sourceIndex = frames.findIndex((f) => f.id === frameId)
  if (sourceIndex < 0) return null
  const sourceFrame = frames[sourceIndex]!
  const newFrameId = makeId("frame")
  const newFrame: SpriteFrame = { id: newFrameId, pixelsRgba: [...sourceFrame.pixelsRgba] }
  const nextFrames = [...frames.slice(0, sourceIndex + 1), newFrame, ...frames.slice(sourceIndex + 1)]
  const updatedSprite = syncPixelsRgbaWithFrame0({ ...sprite, frames: nextFrames })
  return {
    project: {
      ...project,
      resources: {
        ...project.resources,
        sprites: project.resources.sprites.map((entry) => (entry.id === spriteId ? updatedSprite : entry))
      }
    },
    frameId: newFrameId
  }
}

export function deleteSpriteFrame(project: ProjectV1, spriteId: string, frameId: string): ProjectV1 {
  const sprite = project.resources.sprites.find((entry) => entry.id === spriteId)
  if (!sprite) return project
  const frames = getSpriteFrames(sprite)
  if (frames.length <= 1) return project
  const nextFrames = frames.filter((f) => f.id !== frameId)
  if (nextFrames.length === frames.length) return project
  const updatedSprite = syncPixelsRgbaWithFrame0({ ...sprite, frames: nextFrames })
  return {
    ...project,
    resources: {
      ...project.resources,
      sprites: project.resources.sprites.map((entry) => (entry.id === spriteId ? updatedSprite : entry))
    }
  }
}

export function updateSpriteFramePixels(
  project: ProjectV1,
  spriteId: string,
  frameId: string,
  pixelsRgba: string[]
): ProjectV1 {
  const sprite = project.resources.sprites.find((entry) => entry.id === spriteId)
  if (!sprite) return project
  const frames = getSpriteFrames(sprite)
  const frameIndex = frames.findIndex((f) => f.id === frameId)
  if (frameIndex < 0) return project
  const width = normalizeSpriteDimension(sprite.width)
  const height = normalizeSpriteDimension(sprite.height)
  const normalizedPixels = normalizeSpritePixels(width, height, pixelsRgba)
  const nextFrames = frames.map((f) => (f.id === frameId ? { ...f, pixelsRgba: normalizedPixels } : f))
  const updatedSprite = syncPixelsRgbaWithFrame0({ ...sprite, frames: nextFrames })
  return {
    ...project,
    resources: {
      ...project.resources,
      sprites: project.resources.sprites.map((entry) => (entry.id === spriteId ? updatedSprite : entry))
    }
  }
}

export function reorderSpriteFrame(
  project: ProjectV1,
  spriteId: string,
  frameId: string,
  newIndex: number
): ProjectV1 {
  const sprite = project.resources.sprites.find((entry) => entry.id === spriteId)
  if (!sprite) return project
  const frames = getSpriteFrames(sprite)
  const currentIndex = frames.findIndex((f) => f.id === frameId)
  if (currentIndex < 0) return project
  const clampedIndex = Math.max(0, Math.min(newIndex, frames.length - 1))
  if (clampedIndex === currentIndex) return project
  const nextFrames = [...frames]
  const [moved] = nextFrames.splice(currentIndex, 1)
  if (!moved) return project
  nextFrames.splice(clampedIndex, 0, moved)
  const updatedSprite = syncPixelsRgbaWithFrame0({ ...sprite, frames: nextFrames })
  return {
    ...project,
    resources: {
      ...project.resources,
      sprites: project.resources.sprites.map((entry) => (entry.id === spriteId ? updatedSprite : entry))
    }
  }
}

export function updateSpritePixelsRgba(project: ProjectV1, spriteId: string, pixelsRgba: string[]): ProjectV1 {
  return {
    ...project,
    resources: {
      ...project.resources,
      sprites: project.resources.sprites.map((spriteEntry) => {
        if (spriteEntry.id !== spriteId) {
          return spriteEntry
        }
        const width = normalizeSpriteDimension(spriteEntry.width)
        const height = normalizeSpriteDimension(spriteEntry.height)
        return {
          ...spriteEntry,
          width,
          height,
          pixelsRgba: normalizeSpritePixels(width, height, pixelsRgba)
        }
      })
    }
  }
}

export function transformSpritePixels(
  project: ProjectV1,
  spriteId: string,
  width: number,
  height: number,
  pixelsRgba: string[]
): ProjectV1 {
  const normalizedWidth = normalizeSpriteDimension(width)
  const normalizedHeight = normalizeSpriteDimension(height)
  return {
    ...project,
    resources: {
      ...project.resources,
      sprites: project.resources.sprites.map((spriteEntry) => {
        if (spriteEntry.id !== spriteId) return spriteEntry
        return {
          ...spriteEntry,
          width: normalizedWidth,
          height: normalizedHeight,
          pixelsRgba: normalizeSpritePixels(normalizedWidth, normalizedHeight, pixelsRgba)
        }
      })
    }
  }
}

export function updateObjectSpriteId(project: ProjectV1, objectId: string, spriteId: string | null): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === objectId
        ? {
            ...objectEntry,
            spriteId
          }
        : objectEntry
    )
  }
}

export function updateSoundAssetSource(project: ProjectV1, soundId: string, assetSource: string): ProjectV1 {
  return {
    ...project,
    resources: {
      ...project.resources,
      sounds: project.resources.sounds.map((soundEntry) =>
        soundEntry.id === soundId
          ? {
              ...soundEntry,
              assetSource,
              uploadStatus: assetSource.trim() ? "ready" : "notConnected"
            }
          : soundEntry
      )
    }
  }
}

export function addObjectEvent(project: ProjectV1, input: AddObjectEventInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: [
              ...objectEntry.events,
              {
                id: makeId("event"),
                type: input.type,
                key: input.key ?? null,
                keyboardMode: input.keyboardMode ?? (input.type === "Keyboard" ? "down" : null),
                targetObjectId: input.targetObjectId ?? null,
                intervalMs: input.intervalMs ?? null,
                ...(input.type === "Mouse" ? { mouseMode: input.mouseMode ?? "down" } : {}),
                ...(input.type === "CustomEvent" ? {
                  eventName: input.eventName ?? "event",
                  sourceObjectId: input.sourceObjectId ?? null
                } : {}),
                items: []
              }
            ]
          }
        : objectEntry
    )
  }
}

export function removeObjectEvent(project: ProjectV1, input: RemoveObjectEventInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.filter((eventEntry) => eventEntry.id !== input.eventId)
          }
        : objectEntry
    )
  }
}

export function duplicateObjectEvent(project: ProjectV1, input: DuplicateObjectEventInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) => {
      if (objectEntry.id !== input.objectId) {
        return objectEntry
      }
      const sourceEvent = objectEntry.events.find((eventEntry) => eventEntry.id === input.eventId)
      if (!sourceEvent) {
        return objectEntry
      }
      const sourceIndex = objectEntry.events.indexOf(sourceEvent)
      const clonedEvent = {
        ...JSON.parse(JSON.stringify(sourceEvent)) as typeof sourceEvent,
        id: makeId("event"),
        items: sourceEvent.items.map((item) => cloneObjectEventItemForPaste(item))
      }
      const events = [...objectEntry.events]
      events.splice(sourceIndex + 1, 0, clonedEvent)
      return { ...objectEntry, events }
    })
  }
}

export function addObjectEventAction(project: ProjectV1, input: AddObjectEventActionInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: [...eventEntry.items, toActionItem(input.action)]
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function updateObjectEventAction(project: ProjectV1, input: UpdateObjectEventActionInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: eventEntry.items.map((itemEntry) =>
                      itemEntry.type === "action" && itemEntry.action.id === input.actionId
                        ? { ...itemEntry, action: { id: input.actionId, ...input.action } as ObjectAction }
                        : itemEntry
                    )
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function removeObjectEventAction(project: ProjectV1, input: RemoveObjectEventActionInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: eventEntry.items.filter(
                      (itemEntry) => itemEntry.type !== "action" || itemEntry.action.id !== input.actionId
                    )
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function moveObjectEventAction(project: ProjectV1, input: MoveObjectEventActionInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) => {
      if (objectEntry.id !== input.objectId) {
        return objectEntry
      }

      return {
        ...objectEntry,
        events: objectEntry.events.map((eventEntry) => {
          if (eventEntry.id !== input.eventId) {
            return eventEntry
          }
          const moveResult = moveActionInItems(eventEntry.items, input.actionId, input.direction)
          if (!moveResult.updated) {
            return eventEntry
          }
          return {
            ...eventEntry,
            items: moveResult.items
          }
        })
      }
    })
  }
}

export function moveObjectEventItem(project: ProjectV1, input: MoveObjectEventItemInput): ProjectV1 {
  const targetBranch = input.targetBranch ?? "then"
  const targetPosition = input.position ?? "bottom"
  return {
    ...project,
    objects: project.objects.map((objectEntry) => {
      if (objectEntry.id !== input.objectId) {
        return objectEntry
      }
      return {
        ...objectEntry,
        events: objectEntry.events.map((eventEntry) => {
          if (eventEntry.id !== input.eventId) {
            return eventEntry
          }
          const removalResult = removeActionItemFromItems(eventEntry.items, input.actionId)
          if (!removalResult.removed || !removalResult.removedItem) {
            return eventEntry
          }
          const insertionResult = insertActionItemIntoItems(removalResult.items, {
            item: removalResult.removedItem,
            targetBranch,
            position: targetPosition,
            ...(input.targetIfBlockId ? { targetIfBlockId: input.targetIfBlockId } : {}),
            ...(input.targetActionId ? { targetActionId: input.targetActionId } : {})
          })
          if (!insertionResult.inserted) {
            return eventEntry
          }
          return {
            ...eventEntry,
            items: insertionResult.items
          }
        })
      }
    })
  }
}

export function cloneObjectEventItemForPaste(item: ObjectEventItem): ObjectEventItem {
  if (item.type === "action") {
    const clonedAction = JSON.parse(JSON.stringify(item.action)) as ObjectAction
    return {
      id: makeId("item"),
      type: "action",
      action: {
        ...clonedAction,
        id: makeId("action")
      }
    }
  }
  if (item.type === "if") {
    return {
      id: makeId("if"),
      type: "if",
      condition: cloneIfCondition(item.condition),
      thenActions: item.thenActions.map((entry) => cloneObjectEventItemForPaste(entry)),
      elseActions: item.elseActions.map((entry) => cloneObjectEventItemForPaste(entry))
    }
  }
  const cloned = JSON.parse(JSON.stringify(item)) as ObjectEventItem
  if (cloned.type === "repeat" || cloned.type === "forEachList" || cloned.type === "forEachMap") {
    cloned.id = makeId("block")
    cloned.actions = cloned.actions.map((entry) => cloneObjectEventItemForPaste(entry))
  }
  return cloned
}

export function insertObjectEventItem(project: ProjectV1, input: InsertObjectEventItemInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) => {
      if (objectEntry.id !== input.objectId) {
        return objectEntry
      }
      return {
        ...objectEntry,
        events: objectEntry.events.map((eventEntry) => {
          if (eventEntry.id !== input.eventId) {
            return eventEntry
          }
          if (!input.afterItemId) {
            return {
              ...eventEntry,
              items: [...eventEntry.items, input.item]
            }
          }
          const insertResult = insertEventItemAfterItemInItems(eventEntry.items, input.afterItemId, input.item)
          if (insertResult.inserted) {
            return {
              ...eventEntry,
              items: insertResult.items
            }
          }
          return {
            ...eventEntry,
            items: [...eventEntry.items, input.item]
          }
        })
      }
    })
  }
}

export type AddObjectEventBlockInput = {
  objectId: string
  eventId: string
  block: ObjectControlBlockItem
  parentBlockId?: string
  parentBranch?: "then" | "else"
}

export type AddBlockActionInput = {
  objectId: string
  eventId: string
  blockId: string
  branch?: "then" | "else"
  action: ObjectActionDraft
}

export type UpdateBlockActionInput = {
  objectId: string
  eventId: string
  blockId: string
  branch?: "then" | "else"
  actionId: string
  action: ObjectActionDraft
}

export type RemoveBlockActionInput = {
  objectId: string
  eventId: string
  blockId: string
  branch?: "then" | "else"
  actionId: string
}

export type RemoveObjectEventBlockInput = {
  objectId: string
  eventId: string
  blockId: string
}

export type UpdateObjectEventBlockInput = {
  objectId: string
  eventId: string
  blockId: string
  updates: Partial<ObjectControlBlockItem>
}

export function addObjectEventBlock(project: ProjectV1, input: AddObjectEventBlockInput): ProjectV1 {
  const parentBranch = input.parentBranch ?? "then"
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items:
                      input.parentBlockId === undefined
                        ? [...eventEntry.items, input.block]
                        : updateBlockInItems(eventEntry.items, input.parentBlockId, (block) => {
                            const branches = getBlockBranches(block)
                            const branchIndex = parentBranch === "else" ? 1 : 0
                            const updatedBranches = branches.map((b, i) =>
                              i === branchIndex ? [...b, input.block] : b
                            )
                            return withUpdatedBranches(block, updatedBranches)
                          }).items
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function removeObjectEventBlock(project: ProjectV1, input: RemoveObjectEventBlockInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? { ...eventEntry, items: removeBlockFromItems(eventEntry.items, input.blockId).items }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function updateObjectEventBlock(project: ProjectV1, input: UpdateObjectEventBlockInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: updateBlockInItems(eventEntry.items, input.blockId, (block) => ({
                      ...block,
                      ...input.updates,
                      id: block.id,
                      type: block.type
                    } as ObjectEventItem)).items
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function addBlockAction(project: ProjectV1, input: AddBlockActionInput): ProjectV1 {
  const branch = input.branch ?? "then"
  const nextActionItem = toActionItem(input.action)
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: updateBlockInItems(eventEntry.items, input.blockId, (block) => {
                      const branches = getBlockBranches(block)
                      const branchIndex = branch === "else" ? 1 : 0
                      const updatedBranches = branches.map((b, i) =>
                        i === branchIndex ? [...b, nextActionItem] : b
                      )
                      return withUpdatedBranches(block, updatedBranches)
                    }).items
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function updateBlockAction(project: ProjectV1, input: UpdateBlockActionInput): ProjectV1 {
  const branch = input.branch ?? "then"
  const nextAction = { id: input.actionId, ...input.action } as ObjectAction
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: updateBlockInItems(eventEntry.items, input.blockId, (block) => {
                      const branches = getBlockBranches(block)
                      const branchIndex = branch === "else" ? 1 : 0
                      const updatedBranches = branches.map((b, i) =>
                        i === branchIndex
                          ? b.map((entry) =>
                              entry.type === "action" && entry.action.id === input.actionId
                                ? { ...entry, action: nextAction }
                                : entry
                            )
                          : b
                      )
                      return withUpdatedBranches(block, updatedBranches)
                    }).items
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function removeBlockAction(project: ProjectV1, input: RemoveBlockActionInput): ProjectV1 {
  const branch = input.branch ?? "then"
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: updateBlockInItems(eventEntry.items, input.blockId, (block) => {
                      const branches = getBlockBranches(block)
                      const branchIndex = branch === "else" ? 1 : 0
                      const updatedBranches = branches.map((b, i) =>
                        i === branchIndex
                          ? b.filter((entry) => entry.type !== "action" || entry.action.id !== input.actionId)
                          : b
                      )
                      return withUpdatedBranches(block, updatedBranches)
                    }).items
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function addObjectEventIfBlock(project: ProjectV1, input: AddObjectEventIfBlockInput): ProjectV1 {
  const parentBranch = input.parentBranch ?? "then"
  const nextIfBlock: ObjectIfBlock = {
    id: makeId("if"),
    type: "if",
    condition: input.condition,
    thenActions: [],
    elseActions: []
  }
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items:
                      input.parentIfBlockId === undefined
                        ? [...eventEntry.items, nextIfBlock]
                        : updateIfBlockInItems(eventEntry.items, input.parentIfBlockId, (ifBlockEntry) => ({
                            ...ifBlockEntry,
                            thenActions:
                              parentBranch === "then"
                                ? [...ifBlockEntry.thenActions, nextIfBlock]
                                : ifBlockEntry.thenActions,
                            elseActions:
                              parentBranch === "else"
                                ? [...ifBlockEntry.elseActions, nextIfBlock]
                                : ifBlockEntry.elseActions
                          })).items
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function updateObjectEventIfBlockCondition(project: ProjectV1, input: UpdateObjectEventIfBlockConditionInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: updateIfBlockInItems(eventEntry.items, input.ifBlockId, (ifBlockEntry) => ({
                      ...ifBlockEntry,
                      condition: input.condition
                    })).items
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function removeObjectEventIfBlock(project: ProjectV1, input: RemoveObjectEventIfBlockInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: removeIfBlockFromItems(eventEntry.items, input.ifBlockId).items
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function addObjectEventIfAction(project: ProjectV1, input: AddObjectEventIfActionInput): ProjectV1 {
  const branch = input.branch ?? "then"
  const nextActionItem = toActionItem(input.action)
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: updateIfBlockInItems(eventEntry.items, input.ifBlockId, (ifBlockEntry) => ({
                      ...ifBlockEntry,
                      thenActions: branch === "then" ? [...ifBlockEntry.thenActions, nextActionItem] : ifBlockEntry.thenActions,
                      elseActions: branch === "else" ? [...ifBlockEntry.elseActions, nextActionItem] : ifBlockEntry.elseActions
                    })).items
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function updateObjectEventIfAction(project: ProjectV1, input: UpdateObjectEventIfActionInput): ProjectV1 {
  const branch = input.branch ?? "then"
  const nextAction = { id: input.actionId, ...input.action } as ObjectAction
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: updateIfBlockInItems(eventEntry.items, input.ifBlockId, (ifBlockEntry) => ({
                      ...ifBlockEntry,
                      thenActions:
                        branch === "then"
                          ? ifBlockEntry.thenActions.map((entry) =>
                              entry.type === "action" && entry.action.id === input.actionId
                                ? { ...entry, action: nextAction }
                                : entry
                            )
                          : ifBlockEntry.thenActions,
                      elseActions:
                        branch === "else"
                          ? ifBlockEntry.elseActions.map((entry) =>
                              entry.type === "action" && entry.action.id === input.actionId
                                ? { ...entry, action: nextAction }
                                : entry
                            )
                          : ifBlockEntry.elseActions
                    })).items
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function removeObjectEventIfAction(project: ProjectV1, input: RemoveObjectEventIfActionInput): ProjectV1 {
  const branch = input.branch ?? "then"
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: updateIfBlockInItems(eventEntry.items, input.ifBlockId, (ifBlockEntry) => ({
                      ...ifBlockEntry,
                      thenActions:
                        branch === "then"
                          ? ifBlockEntry.thenActions.filter(
                              (entry) => entry.type !== "action" || entry.action.id !== input.actionId
                            )
                          : ifBlockEntry.thenActions,
                      elseActions:
                        branch === "else"
                          ? ifBlockEntry.elseActions.filter(
                              (entry) => entry.type !== "action" || entry.action.id !== input.actionId
                            )
                          : ifBlockEntry.elseActions
                    })).items
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function updateObjectEventConfig(project: ProjectV1, input: UpdateObjectEventConfigInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? (() => {
                    const nextMouseMode =
                      eventEntry.type === "Mouse"
                        ? (input.mouseMode === undefined ? (eventEntry.mouseMode ?? "down") : (input.mouseMode ?? "down"))
                        : undefined
                    const currentEvent = eventEntry as typeof eventEntry & {
                      eventName?: string
                      sourceObjectId?: string | null
                    }
                    return {
                      ...eventEntry,
                      key: input.key === undefined ? eventEntry.key : input.key,
                      keyboardMode: input.keyboardMode === undefined ? eventEntry.keyboardMode : input.keyboardMode,
                      targetObjectId: input.targetObjectId === undefined ? eventEntry.targetObjectId : input.targetObjectId,
                      intervalMs: input.intervalMs === undefined ? eventEntry.intervalMs : input.intervalMs,
                      ...(eventEntry.type === "Mouse" && nextMouseMode ? { mouseMode: nextMouseMode } : {}),
                      ...(eventEntry.type === "CustomEvent" ? {
                        eventName: input.eventName === undefined ? (currentEvent.eventName ?? "event") : (input.eventName ?? "event"),
                        sourceObjectId: input.sourceObjectId === undefined ? (currentEvent.sourceObjectId ?? null) : (input.sourceObjectId ?? null)
                      } : {})
                    }
                  })()
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function addGlobalVariable(
  project: ProjectV1,
  input: AddGlobalVariableInput
): { project: ProjectV1; variableId: string | null } {
  const trimmedName = input.name.trim()
  if (!trimmedName) {
    return { project, variableId: null }
  }
  const globalDefinitions = project.variables.global
  if (hasVariableNameConflict(globalDefinitions, trimmedName)) {
    return { project, variableId: null }
  }
  const variableId = makeId("globalVar")
  return {
    project: {
      ...project,
      variables: {
        ...project.variables,
        global: [
          ...globalDefinitions,
          buildVariableDefinition({
            id: variableId,
            name: trimmedName,
            type: input.type,
            initialValue: input.initialValue,
            ...(input.itemType ? { itemType: input.itemType } : {})
          })
        ]
      }
    },
    variableId
  }
}

export function updateGlobalVariable(project: ProjectV1, input: UpdateGlobalVariableInput): ProjectV1 {
  const trimmedName = input.name.trim()
  if (!trimmedName) {
    return project
  }
  const globalDefinitions = project.variables.global
  const existing = globalDefinitions.find((definition) => definition.id === input.variableId)
  if (!existing || hasVariableNameConflict(globalDefinitions, trimmedName, input.variableId)) {
    return project
  }
  const nextDefinition = buildVariableDefinition({
    id: existing.id,
    name: trimmedName,
    type: existing.type,
    initialValue: input.initialValue,
    ...(existing.type === "list" || existing.type === "map"
      ? { itemType: existing.itemType as VariableItemType }
      : {})
  })
  return {
    ...project,
    variables: {
      ...project.variables,
      global: globalDefinitions.map((definition) => (definition.id === input.variableId ? nextDefinition : definition))
    }
  }
}

export function removeGlobalVariable(project: ProjectV1, input: RemoveGlobalVariableInput): ProjectV1 {
  return {
    ...project,
    variables: {
      ...project.variables,
      global: project.variables.global.filter((definition) => definition.id !== input.variableId)
    }
  }
}

export function addObjectVariable(
  project: ProjectV1,
  input: AddObjectVariableInput
): { project: ProjectV1; variableId: string | null } {
  const trimmedName = input.name.trim()
  if (!trimmedName) {
    return { project, variableId: null }
  }
  const currentDefinitions = project.variables.objectByObjectId[input.objectId] ?? []
  if (hasVariableNameConflict(currentDefinitions, trimmedName)) {
    return { project, variableId: null }
  }
  const variableId = makeId("objectVar")
  return {
    project: {
      ...project,
      variables: {
        ...project.variables,
        objectByObjectId: {
          ...project.variables.objectByObjectId,
          [input.objectId]: [
            ...currentDefinitions,
            buildVariableDefinition({
              id: variableId,
              name: trimmedName,
              type: input.type,
              initialValue: input.initialValue,
              ...(input.itemType ? { itemType: input.itemType } : {})
            })
          ]
        }
      }
    },
    variableId
  }
}

export function updateObjectVariable(project: ProjectV1, input: UpdateObjectVariableInput): ProjectV1 {
  const trimmedName = input.name.trim()
  if (!trimmedName) {
    return project
  }
  const currentDefinitions = project.variables.objectByObjectId[input.objectId] ?? []
  const existing = currentDefinitions.find((definition) => definition.id === input.variableId)
  if (!existing || hasVariableNameConflict(currentDefinitions, trimmedName, input.variableId)) {
    return project
  }
  const nextDefinition = buildVariableDefinition({
    id: existing.id,
    name: trimmedName,
    type: existing.type,
    initialValue: input.initialValue,
    ...(existing.type === "list" || existing.type === "map"
      ? { itemType: existing.itemType as VariableItemType }
      : {})
  })
  return {
    ...project,
    variables: {
      ...project.variables,
      objectByObjectId: {
        ...project.variables.objectByObjectId,
        [input.objectId]: currentDefinitions.map((definition) =>
          definition.id === input.variableId ? nextDefinition : definition
        )
      }
    }
  }
}

export function removeObjectVariable(project: ProjectV1, input: RemoveObjectVariableInput): ProjectV1 {
  const currentDefinitions = project.variables.objectByObjectId[input.objectId] ?? []
  return {
    ...project,
    variables: {
      ...project.variables,
      objectByObjectId: {
        ...project.variables.objectByObjectId,
        [input.objectId]: currentDefinitions.filter((definition) => definition.id !== input.variableId)
      }
    }
  }
}

export type UpdateRoomSizeInput = {
  roomId: string
  width: number
  height: number
}

function getNormalizedObjectDimensionForRoomClamp(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_SPRITE_SIZE
  }
  return Math.max(1, Math.round(value))
}

function clampInstanceInsideRoom(
  project: ProjectV1,
  instance: ProjectV1["rooms"][number]["instances"][number],
  roomWidth: number,
  roomHeight: number
): ProjectV1["rooms"][number]["instances"][number] {
  const objectEntry = project.objects.find((entry) => entry.id === instance.objectId)
  const objectWidth = getNormalizedObjectDimensionForRoomClamp(objectEntry?.width)
  const objectHeight = getNormalizedObjectDimensionForRoomClamp(objectEntry?.height)
  const maxX = Math.max(0, roomWidth - objectWidth)
  const maxY = Math.max(0, roomHeight - objectHeight)
  const nextX = Math.max(0, Math.min(maxX, instance.x))
  const nextY = Math.max(0, Math.min(maxY, instance.y))
  if (nextX === instance.x && nextY === instance.y) {
    return instance
  }
  return {
    ...instance,
    x: nextX,
    y: nextY
  }
}

export function updateRoomSize(project: ProjectV1, input: UpdateRoomSizeInput): ProjectV1 {
  const nextWidth = normalizeRoomDimension(input.width, DEFAULT_ROOM_WIDTH)
  const nextHeight = normalizeRoomDimension(input.height, DEFAULT_ROOM_HEIGHT)

  let changed = false
  const nextRooms = project.rooms.map((room) => {
    if (room.id !== input.roomId) {
      return room
    }
    const currentWidth = resolveRoomDimension(room.width, DEFAULT_ROOM_WIDTH)
    const currentHeight = resolveRoomDimension(room.height, DEFAULT_ROOM_HEIGHT)
    const nextInstances = room.instances.map((instance) => clampInstanceInsideRoom(project, instance, nextWidth, nextHeight))
    const instancesChanged = nextInstances.some((instanceEntry, index) => instanceEntry !== room.instances[index])
    const roomChanged =
      room.width !== nextWidth ||
      room.height !== nextHeight ||
      currentWidth !== nextWidth ||
      currentHeight !== nextHeight ||
      instancesChanged
    if (!roomChanged) {
      return room
    }
    changed = true
    return {
      ...room,
      width: nextWidth,
      height: nextHeight,
      instances: instancesChanged ? nextInstances : room.instances
    }
  })

  if (!changed) {
    return project
  }

  return {
    ...project,
    rooms: nextRooms
  }
}

export function moveRoomInstance(project: ProjectV1, input: MoveRoomInstanceInput): ProjectV1 {
  return {
    ...project,
    rooms: project.rooms.map((room) =>
      room.id === input.roomId
        ? {
            ...room,
            instances: room.instances.map((instance) =>
              instance.id === input.instanceId
                ? { ...instance, x: input.x, y: input.y }
                : instance
            )
          }
        : room
    )
  }
}

export type RemoveRoomInstanceInput = {
  roomId: string
  instanceId: string
}

export function removeRoomInstance(project: ProjectV1, input: RemoveRoomInstanceInput): ProjectV1 {
  return {
    ...project,
    rooms: project.rooms.map((room) =>
      room.id === input.roomId
        ? {
            ...room,
            instances: room.instances.filter((instance) => instance.id !== input.instanceId)
          }
        : room
    )
  }
}

export type AddInstanceInput = {
  roomId: string
  objectId: string
  x: number
  y: number
}

export function addInstanceForObject(
  project: ProjectV1,
  input: AddInstanceInput
): { project: ProjectV1; instanceId: string } {
  return addRoomInstance(project, input)
}

export function renameRoom(project: ProjectV1, roomId: string, name: string): ProjectV1 {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return project
  }
  const hasRoom = project.rooms.some((entry) => entry.id === roomId)
  if (!hasRoom) {
    return project
  }
  return {
    ...project,
    rooms: project.rooms.map((entry) =>
      entry.id === roomId ? { ...entry, name: trimmedName } : entry
    )
  }
}

export function deleteRoom(project: ProjectV1, roomId: string): ProjectV1 {
  const hasRoom = project.rooms.some((entry) => entry.id === roomId)
  if (!hasRoom) {
    return project
  }
  return {
    ...project,
    rooms: project.rooms.filter((entry) => entry.id !== roomId)
  }
}

export function createRoomFolder(
  project: ProjectV1,
  name: string,
  parentId: string | null = null
): { project: ProjectV1; folderId: string | null } {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return { project, folderId: null }
  }
  const normalizedParentId = parentId ?? null
  const roomFolders = getRoomFolders(project)
  if (normalizedParentId && !roomFolders.some((entry) => entry.id === normalizedParentId)) {
    return { project, folderId: null }
  }
  if (hasFolderNameConflict(roomFolders, normalizedParentId, trimmedName)) {
    return { project, folderId: null }
  }
  const folderId = makeId("room-folder")
  return {
    project: {
      ...project,
      resources: {
        ...project.resources,
        roomFolders: [
          ...roomFolders,
          {
            id: folderId,
            name: trimmedName,
            parentId: normalizedParentId
          }
        ]
      }
    },
    folderId
  }
}

export function renameRoomFolder(project: ProjectV1, folderId: string, name: string): ProjectV1 {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return project
  }
  const roomFolders = getRoomFolders(project)
  const folderEntry = roomFolders.find((entry) => entry.id === folderId)
  if (!folderEntry) {
    return project
  }
  const parentId = folderEntry.parentId ?? null
  if (hasFolderNameConflict(roomFolders, parentId, trimmedName, folderId)) {
    return project
  }
  return {
    ...project,
    resources: {
      ...project.resources,
      roomFolders: roomFolders.map((entry) =>
        entry.id === folderId
          ? {
              ...entry,
              name: trimmedName
            }
          : entry
      )
    }
  }
}

export function moveRoomFolder(project: ProjectV1, folderId: string, newParentId: string | null): ProjectV1 {
  const roomFolders = getRoomFolders(project)
  const normalizedParent = newParentId ?? null
  const folderEntry = roomFolders.find((entry) => entry.id === folderId)
  if (!folderEntry) {
    return project
  }
  if ((folderEntry.parentId ?? null) === normalizedParent) {
    return project
  }
  if (normalizedParent && !roomFolders.some((entry) => entry.id === normalizedParent)) {
    return project
  }
  if (normalizedParent) {
    const ancestors = new Set<string>()
    let current: string | null = normalizedParent
    while (current) {
      if (current === folderId) {
        return project
      }
      if (ancestors.has(current)) {
        break
      }
      ancestors.add(current)
      const parent = roomFolders.find((entry) => entry.id === current)
      current = parent?.parentId ?? null
    }
  }
  return {
    ...project,
    resources: {
      ...project.resources,
      roomFolders: roomFolders.map((entry) =>
        entry.id === folderId
          ? {
              ...entry,
              parentId: normalizedParent
            }
          : entry
      )
    }
  }
}

export function deleteRoomFolder(project: ProjectV1, folderId: string): ProjectV1 {
  const roomFolders = getRoomFolders(project)
  const hasFolder = roomFolders.some((entry) => entry.id === folderId)
  if (!hasFolder) {
    return project
  }
  const deletedBranchIds = new Set<string>([folderId])
  let hasNewDescendants = true
  while (hasNewDescendants) {
    hasNewDescendants = false
    for (const folderEntry of roomFolders) {
      if (folderEntry.parentId && deletedBranchIds.has(folderEntry.parentId) && !deletedBranchIds.has(folderEntry.id)) {
        deletedBranchIds.add(folderEntry.id)
        hasNewDescendants = true
      }
    }
  }

  return {
    ...project,
    resources: {
      ...project.resources,
      roomFolders: roomFolders.filter((entry) => !deletedBranchIds.has(entry.id))
    },
    rooms: project.rooms.filter((entry) => !entry.folderId || !deletedBranchIds.has(entry.folderId))
  }
}

export function moveRoomToFolder(project: ProjectV1, roomId: string, folderId: string | null): ProjectV1 {
  const normalizedFolderId = folderId ?? null
  const hasRoom = project.rooms.some((entry) => entry.id === roomId)
  if (!hasRoom) {
    return project
  }
  const roomFolders = getRoomFolders(project)
  if (normalizedFolderId && !roomFolders.some((entry) => entry.id === normalizedFolderId)) {
    return project
  }
  return {
    ...project,
    rooms: project.rooms.map((entry) =>
      entry.id === roomId
        ? {
            ...entry,
            folderId: normalizedFolderId
          }
        : entry
    )
  }
}
