import { createEmptyProjectV1, serializeProjectV1 } from "@creadordejocs/project-format"
import { describe, expect, it } from "vitest"
import { createShareWorkerHandler, type ShareWorkerEnv } from "./index.js"

class MemoryKv {
  private store = new Map<string, string>()

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.store.get(key) ?? null)
  }

  put(key: string, value: string): Promise<void> {
    this.store.set(key, value)
    return Promise.resolve()
  }
}

function createEnv(): ShareWorkerEnv {
  return {
    SHARES_KV: new MemoryKv()
  }
}

describe("createShareWorkerHandler", () => {
  it("publishes a project and returns an id", async () => {
    const env = createEnv()
    const project = createEmptyProjectV1("Cloud game")
    const request = new Request("https://api.creadordejocs.com/api/share", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectSource: serializeProjectV1(project) })
    })

    const response = await createShareWorkerHandler(request, env)
    const payload = (await response.json()) as { id: string }

    expect(response.status).toBe(200)
    expect(payload.id).toMatch(/^[a-z0-9]{10}$/)
  })

  it("reads a published project by id", async () => {
    const env = createEnv()
    const project = createEmptyProjectV1("Playable game")
    const publishRequest = new Request("https://api.creadordejocs.com/api/share", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectSource: serializeProjectV1(project) })
    })
    const publishResponse = await createShareWorkerHandler(publishRequest, env)
    const publishPayload = (await publishResponse.json()) as { id: string }
    const getRequest = new Request(`https://api.creadordejocs.com/api/share/${publishPayload.id}`)

    const response = await createShareWorkerHandler(getRequest, env)
    const payload = (await response.json()) as { id: string; projectSource: string }

    expect(response.status).toBe(200)
    expect(payload.id).toBe(publishPayload.id)
    expect(payload.projectSource).toContain('"version":1')
  })

  it("returns 404 for unknown id", async () => {
    const env = createEnv()
    const request = new Request("https://api.creadordejocs.com/api/share/doesnotexist")

    const response = await createShareWorkerHandler(request, env)

    expect(response.status).toBe(404)
  })
})
