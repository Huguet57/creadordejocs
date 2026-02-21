import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { InMemoryKvProvider } from "./in-memory-kv-provider.js"
import { resetKvStorageProvider, setKvStorageProvider } from "./get-kv-storage-provider.js"
import {
  copyProjectOutboxItems,
  enqueueProjectDelete,
  enqueueProjectUpsert,
  listProjectOutboxItems,
  markProjectOutboxItemFailed,
  removeProjectOutboxItem
} from "./project-outbox.js"

describe("project-outbox", () => {
  let kv: InMemoryKvProvider

  beforeEach(() => {
    kv = new InMemoryKvProvider()
    setKvStorageProvider(kv)
  })

  afterEach(() => {
    resetKvStorageProvider()
  })

  it("enqueues upsert items and lists them for a scope", () => {
    enqueueProjectUpsert("scope-a", {
      projectId: "project-1",
      name: "Project one",
      projectSource: "{\"version\":1}",
      updatedAtIso: "2026-02-20T10:00:00.000Z"
    })

    const outbox = listProjectOutboxItems("scope-a")
    expect(outbox).toHaveLength(1)
    expect(outbox[0]?.operation).toBe("upsert")
    expect(outbox[0]?.attempts).toBe(0)
  })

  it("deduplicates upsert per project and keeps the latest payload", () => {
    enqueueProjectUpsert("scope-a", {
      projectId: "project-1",
      name: "Old",
      projectSource: "{\"version\":1,\"name\":\"old\"}",
      updatedAtIso: "2026-02-20T10:00:00.000Z"
    })
    enqueueProjectUpsert("scope-a", {
      projectId: "project-1",
      name: "New",
      projectSource: "{\"version\":1,\"name\":\"new\"}",
      updatedAtIso: "2026-02-20T10:00:01.000Z"
    })

    const outbox = listProjectOutboxItems("scope-a")
    expect(outbox).toHaveLength(1)
    expect(outbox[0]?.name).toBe("New")
    expect(outbox[0]?.projectSource).toContain("\"new\"")
  })

  it("delete operation replaces pending upsert for the same project", () => {
    enqueueProjectUpsert("scope-a", {
      projectId: "project-1",
      name: "Draft",
      projectSource: "{\"version\":1}",
      updatedAtIso: "2026-02-20T10:00:00.000Z"
    })

    enqueueProjectDelete("scope-a", {
      projectId: "project-1",
      updatedAtIso: "2026-02-20T10:00:02.000Z"
    })

    const outbox = listProjectOutboxItems("scope-a")
    expect(outbox).toHaveLength(1)
    expect(outbox[0]?.operation).toBe("delete")
    expect(outbox[0]?.projectSource).toBeNull()
  })

  it("marks failed item with exponential backoff metadata", () => {
    enqueueProjectUpsert("scope-a", {
      projectId: "project-1",
      name: "Draft",
      projectSource: "{\"version\":1}",
      updatedAtIso: "2026-02-20T10:00:00.000Z"
    })
    const item = listProjectOutboxItems("scope-a")[0]
    expect(item).toBeDefined()

    markProjectOutboxItemFailed("scope-a", item!.id, 1_000_000)
    const failed = listProjectOutboxItems("scope-a")[0]
    expect(failed?.attempts).toBe(1)
    expect((failed?.nextRetryAtMs ?? 0) > 1_000_000).toBe(true)
  })

  it("isolates outbox items by scope", () => {
    enqueueProjectUpsert("scope-a", {
      projectId: "project-a",
      name: "A",
      projectSource: "{\"version\":1}",
      updatedAtIso: "2026-02-20T10:00:00.000Z"
    })
    enqueueProjectUpsert("scope-b", {
      projectId: "project-b",
      name: "B",
      projectSource: "{\"version\":1}",
      updatedAtIso: "2026-02-20T10:00:00.000Z"
    })

    expect(listProjectOutboxItems("scope-a")).toHaveLength(1)
    expect(listProjectOutboxItems("scope-b")).toHaveLength(1)
    expect(listProjectOutboxItems("scope-a")[0]?.projectId).toBe("project-a")
    expect(listProjectOutboxItems("scope-b")[0]?.projectId).toBe("project-b")
  })

  it("removes outbox item by id", () => {
    enqueueProjectUpsert("scope-a", {
      projectId: "project-1",
      name: "Project",
      projectSource: "{\"version\":1}",
      updatedAtIso: "2026-02-20T10:00:00.000Z"
    })
    const item = listProjectOutboxItems("scope-a")[0]
    expect(item).toBeDefined()

    removeProjectOutboxItem("scope-a", item!.id)
    expect(listProjectOutboxItems("scope-a")).toEqual([])
  })

  it("copies pending items from one scope to another", () => {
    enqueueProjectUpsert("scope-anon", {
      projectId: "project-1",
      name: "Anon project",
      projectSource: "{\"version\":1}",
      updatedAtIso: "2026-02-20T10:00:00.000Z"
    })

    const copied = copyProjectOutboxItems("scope-anon", "scope-user")

    expect(copied).toBe(1)
    expect(listProjectOutboxItems("scope-user")).toHaveLength(1)
    expect(listProjectOutboxItems("scope-user")[0]?.projectId).toBe("project-1")
  })
})
