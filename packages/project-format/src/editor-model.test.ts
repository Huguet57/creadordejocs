import { describe, expect, it } from "vitest"
import { createEmptyProjectV1 } from "./schema-v1.js"
import {
  createRoom,
  createRoomFolder,
  renameRoom,
  deleteRoom,
  renameRoomFolder,
  moveRoomFolder,
  deleteRoomFolder,
  moveRoomToFolder,
  quickCreateObject,
  quickCreateSprite,
  addRoomInstance,
  updateRoomSize,
  updateRoomBackgroundSprite
} from "./editor-model.js"

function projectWithRoom(name: string, folderId: string | null = null) {
  const project = createEmptyProjectV1("test")
  return createRoom(project, name, folderId)
}

function projectWithRoomFolder(folderName: string, parentId: string | null = null) {
  const project = createEmptyProjectV1("test")
  return createRoomFolder(project, folderName, parentId)
}

describe("createRoom with folderId", () => {
  it("creates a room with folderId when provided", () => {
    const project = createEmptyProjectV1("test")
    const folderResult = createRoomFolder(project, "World 1")
    const roomResult = createRoom(folderResult.project, "Level 1", folderResult.folderId)

    const room = roomResult.project.rooms.find((r) => r.id === roomResult.roomId)
    expect(room).toBeDefined()
    expect(room!.folderId).toBe(folderResult.folderId)
  })

  it("creates rooms with default dimensions", () => {
    const project = createEmptyProjectV1("test")
    const roomResult = createRoom(project, "Level 1")
    const room = roomResult.project.rooms.find((r) => r.id === roomResult.roomId)
    expect(room).toBeDefined()
    expect(room!.width).toBe(768)
    expect(room!.height).toBe(512)
    expect(room!.backgroundSpriteId).toBeNull()
  })

  it("creates a room with null folderId by default", () => {
    const result = projectWithRoom("Sala 1")

    const room = result.project.rooms.find((r) => r.id === result.roomId)
    expect(room).toBeDefined()
    expect(room!.folderId).toBeNull()
  })
})

describe("updateRoomSize", () => {
  it("applies minimum room size and rounds dimensions", () => {
    const base = createRoom(createEmptyProjectV1("test"), "Room")
    const next = updateRoomSize(base.project, { roomId: base.roomId, width: 200.2, height: 100.9 })
    const room = next.rooms.find((entry) => entry.id === base.roomId)
    expect(room).toBeDefined()
    expect(room!.width).toBe(768)
    expect(room!.height).toBe(512)
  })

  it("clamps instances inside room bounds when reducing size", () => {
    const initial = createEmptyProjectV1("test")
    const objectResult = quickCreateObject(initial, {
      name: "Player",
      width: 64,
      height: 32
    })
    const roomResult = createRoom(objectResult.project, "Room")
    const withInstance = addRoomInstance(roomResult.project, {
      roomId: roomResult.roomId,
      objectId: objectResult.objectId,
      x: 1800,
      y: 1000
    }).project

    const resized = updateRoomSize(withInstance, {
      roomId: roomResult.roomId,
      width: 900,
      height: 500
    })
    const room = resized.rooms.find((entry) => entry.id === roomResult.roomId)
    const instance = room?.instances[0]
    expect(instance).toBeDefined()
    expect(instance!.x).toBe(836)
    expect(instance!.y).toBe(480)
  })
})

describe("updateRoomBackgroundSprite", () => {
  it("sets and clears room background sprite", () => {
    const initial = createEmptyProjectV1("test")
    const spriteResult = quickCreateSprite(initial, "Background")
    const roomResult = createRoom(spriteResult.project, "Room")

    const withBackground = updateRoomBackgroundSprite(roomResult.project, {
      roomId: roomResult.roomId,
      backgroundSpriteId: spriteResult.spriteId
    })
    const roomWithBackground = withBackground.rooms.find((entry) => entry.id === roomResult.roomId)
    expect(roomWithBackground?.backgroundSpriteId).toBe(spriteResult.spriteId)

    const cleared = updateRoomBackgroundSprite(withBackground, {
      roomId: roomResult.roomId,
      backgroundSpriteId: null
    })
    const roomCleared = cleared.rooms.find((entry) => entry.id === roomResult.roomId)
    expect(roomCleared?.backgroundSpriteId).toBeNull()
  })
})

describe("renameRoom", () => {
  it("renames an existing room", () => {
    const { project, roomId } = projectWithRoom("Old name")
    const next = renameRoom(project, roomId, "New name")

    const room = next.rooms.find((r) => r.id === roomId)
    expect(room!.name).toBe("New name")
  })

  it("returns project unchanged for empty name", () => {
    const { project, roomId } = projectWithRoom("Sala 1")
    const next = renameRoom(project, roomId, "  ")

    expect(next).toBe(project)
  })

  it("returns project unchanged for non-existent roomId", () => {
    const { project } = projectWithRoom("Sala 1")
    const next = renameRoom(project, "non-existent", "New")

    expect(next).toBe(project)
  })
})

describe("deleteRoom", () => {
  it("removes the room from project.rooms", () => {
    const { project, roomId } = projectWithRoom("Sala 1")
    const next = deleteRoom(project, roomId)

    expect(next.rooms.find((r) => r.id === roomId)).toBeUndefined()
  })

  it("returns project unchanged for non-existent roomId", () => {
    const { project } = projectWithRoom("Sala 1")
    const next = deleteRoom(project, "non-existent")

    expect(next).toBe(project)
  })
})

describe("createRoomFolder", () => {
  it("creates a folder at root level", () => {
    const { project, folderId } = projectWithRoomFolder("World 1")

    expect(folderId).toBeTruthy()
    const folders = project.resources.roomFolders ?? []
    expect(folders).toHaveLength(1)
    expect(folders[0]!.name).toBe("World 1")
    expect(folders[0]!.parentId).toBeNull()
  })

  it("creates a subfolder under a parent", () => {
    const { project: p1, folderId: parentId } = projectWithRoomFolder("World 1")
    const { project: p2, folderId: childId } = createRoomFolder(p1, "Section A", parentId)

    expect(childId).toBeTruthy()
    const folders = p2.resources.roomFolders ?? []
    const child = folders.find((f) => f.id === childId)
    expect(child!.parentId).toBe(parentId)
  })

  it("rejects empty name", () => {
    const project = createEmptyProjectV1("test")
    const { project: next, folderId } = createRoomFolder(project, "  ")

    expect(folderId).toBeNull()
    expect(next).toBe(project)
  })

  it("rejects duplicate name in same parent", () => {
    const { project: p1 } = projectWithRoomFolder("World 1")
    const { project: p2, folderId } = createRoomFolder(p1, "World 1")

    expect(folderId).toBeNull()
    expect(p2).toBe(p1)
  })

  it("rejects if parent folder does not exist", () => {
    const project = createEmptyProjectV1("test")
    const { project: next, folderId } = createRoomFolder(project, "Child", "non-existent-parent")

    expect(folderId).toBeNull()
    expect(next).toBe(project)
  })
})

describe("renameRoomFolder", () => {
  it("renames an existing folder", () => {
    const { project, folderId } = projectWithRoomFolder("Old")
    const next = renameRoomFolder(project, folderId!, "New")

    const folder = (next.resources.roomFolders ?? []).find((f) => f.id === folderId)
    expect(folder!.name).toBe("New")
  })

  it("rejects empty name", () => {
    const { project, folderId } = projectWithRoomFolder("Keep")
    const next = renameRoomFolder(project, folderId!, "  ")

    expect(next).toBe(project)
  })

  it("rejects duplicate name in same parent", () => {
    const { project: p1 } = projectWithRoomFolder("A")
    const { project: p2, folderId: bId } = createRoomFolder(p1, "B")
    const next = renameRoomFolder(p2, bId!, "A")

    expect(next).toBe(p2)
  })

  it("returns project unchanged for non-existent folderId", () => {
    const { project } = projectWithRoomFolder("A")
    const next = renameRoomFolder(project, "non-existent", "B")

    expect(next).toBe(project)
  })
})

describe("moveRoomFolder", () => {
  it("moves folder to a new parent", () => {
    const { project: p1, folderId: parentId } = projectWithRoomFolder("Parent")
    const { project: p2, folderId: childId } = createRoomFolder(p1, "Child")
    const next = moveRoomFolder(p2, childId!, parentId)

    const child = (next.resources.roomFolders ?? []).find((f) => f.id === childId)
    expect(child!.parentId).toBe(parentId)
  })

  it("moves folder to root (null parent)", () => {
    const { project: p1, folderId: parentId } = projectWithRoomFolder("Parent")
    const { project: p2, folderId: childId } = createRoomFolder(p1, "Child", parentId)
    const next = moveRoomFolder(p2, childId!, null)

    const child = (next.resources.roomFolders ?? []).find((f) => f.id === childId)
    expect(child!.parentId).toBeNull()
  })

  it("detects cycle and rejects", () => {
    const { project: p1, folderId: aId } = projectWithRoomFolder("A")
    const { project: p2, folderId: bId } = createRoomFolder(p1, "B", aId)
    // Try to move A under B (cycle: A -> B -> A)
    const next = moveRoomFolder(p2, aId!, bId)

    expect(next).toBe(p2)
  })

  it("returns unchanged if already at target parent", () => {
    const { project: p1, folderId: parentId } = projectWithRoomFolder("Parent")
    const { project: p2, folderId: childId } = createRoomFolder(p1, "Child", parentId)
    const next = moveRoomFolder(p2, childId!, parentId)

    expect(next).toBe(p2)
  })
})

describe("deleteRoomFolder", () => {
  it("deletes folder and rooms inside it", () => {
    const { project: p1, folderId } = projectWithRoomFolder("World 1")
    const { project: p2, roomId } = createRoom(p1, "Level 1", folderId)
    const next = deleteRoomFolder(p2, folderId!)

    expect((next.resources.roomFolders ?? []).find((f) => f.id === folderId)).toBeUndefined()
    expect(next.rooms.find((r) => r.id === roomId)).toBeUndefined()
  })

  it("cascade-deletes child folders and their rooms", () => {
    const { project: p1, folderId: parentId } = projectWithRoomFolder("World 1")
    const { project: p2, folderId: childId } = createRoomFolder(p1, "Section A", parentId)
    const { project: p3, roomId } = createRoom(p2, "Level in child", childId)
    const next = deleteRoomFolder(p3, parentId!)

    expect((next.resources.roomFolders ?? [])).toHaveLength(0)
    expect(next.rooms.find((r) => r.id === roomId)).toBeUndefined()
  })

  it("returns project unchanged for non-existent folderId", () => {
    const project = createEmptyProjectV1("test")
    const next = deleteRoomFolder(project, "non-existent")

    expect(next).toBe(project)
  })
})

describe("moveRoomToFolder", () => {
  it("moves a room to a folder", () => {
    const { project: p1, folderId } = projectWithRoomFolder("World 1")
    const { project: p2, roomId } = createRoom(p1, "Sala 1")
    const next = moveRoomToFolder(p2, roomId, folderId)

    const room = next.rooms.find((r) => r.id === roomId)
    expect(room!.folderId).toBe(folderId)
  })

  it("moves a room to root (null)", () => {
    const { project: p1, folderId } = projectWithRoomFolder("World 1")
    const { project: p2, roomId } = createRoom(p1, "Sala 1", folderId)
    const next = moveRoomToFolder(p2, roomId, null)

    const room = next.rooms.find((r) => r.id === roomId)
    expect(room!.folderId).toBeNull()
  })

  it("returns project unchanged for non-existent roomId", () => {
    const project = createEmptyProjectV1("test")
    const next = moveRoomToFolder(project, "non-existent", null)

    expect(next).toBe(project)
  })

  it("returns project unchanged for non-existent folderId", () => {
    const { project, roomId } = projectWithRoom("Sala 1")
    const next = moveRoomToFolder(project, roomId, "non-existent-folder")

    expect(next).toBe(project)
  })
})
