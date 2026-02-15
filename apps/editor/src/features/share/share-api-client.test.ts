import { createEmptyProjectV1, serializeProjectV1 } from "@creadordejocs/project-format"
import { afterEach, describe, expect, it, vi } from "vitest"
import { buildSharePermalink, copyPermalinkToClipboard, publishProjectToShareApi } from "./share-api-client.js"

describe("buildSharePermalink", () => {
  it("builds a stable /play/:id URL", () => {
    expect(buildSharePermalink("https://creadordejocs.com", "abc123")).toBe("https://creadordejocs.com/play/abc123")
  })

  it("removes trailing slash from origin", () => {
    expect(buildSharePermalink("https://creadordejocs.com/", "abc123")).toBe("https://creadordejocs.com/play/abc123")
  })
})

describe("publishProjectToShareApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("posts serialized project and returns share id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "share_123" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    )
    vi.stubGlobal("fetch", fetchMock)
    const project = createEmptyProjectV1("Published game")

    const result = await publishProjectToShareApi(project, { apiBaseUrl: "https://api.creadordejocs.com" })

    expect(result.id).toBe("share_123")
    expect(fetchMock).toHaveBeenCalledWith("https://api.creadordejocs.com/api/share", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectSource: serializeProjectV1(project) })
    })
  })

  it("throws an error when API returns a non-2xx status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "invalid_payload" }), {
          status: 400,
          headers: { "content-type": "application/json" }
        })
      )
    )
    const project = createEmptyProjectV1("Broken game")

    await expect(publishProjectToShareApi(project)).rejects.toThrow("Could not publish game.")
  })
})

describe("copyPermalinkToClipboard", () => {
  it("writes the URL into clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)

    await copyPermalinkToClipboard("https://creadordejocs.com/play/abc123", { writeText })

    expect(writeText).toHaveBeenCalledWith("https://creadordejocs.com/play/abc123")
  })
})
