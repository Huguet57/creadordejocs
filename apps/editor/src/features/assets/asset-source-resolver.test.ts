import { afterEach, describe, expect, it, vi } from "vitest"
import { resolveAssetSource } from "./asset-source-resolver.js"

const resolveMock = vi.fn((source: string) => {
  if (source.startsWith("asset://mock/")) {
    return Promise.resolve(`blob:resolved-${source}`)
  }
  return Promise.resolve(source)
})

vi.mock("./asset-storage-provider.js", () => ({
  getAssetStorageProvider: () =>
    Promise.resolve({
      upload: vi.fn(),
      resolve: (...args: [string]) => resolveMock(...args)
    })
}))

describe("resolveAssetSource", () => {
  afterEach(() => {
    resolveMock.mockClear()
  })

  it("returns null for empty string", async () => {
    expect(await resolveAssetSource("")).toBeNull()
  })

  it("returns null for whitespace-only string", async () => {
    expect(await resolveAssetSource("   ")).toBeNull()
  })

  it("does not call provider for empty input", async () => {
    await resolveAssetSource("")
    expect(resolveMock).not.toHaveBeenCalled()
  })

  it("delegates to provider.resolve for non-empty input", async () => {
    await resolveAssetSource("asset://mock/sprite.png")
    expect(resolveMock).toHaveBeenCalledWith("asset://mock/sprite.png")
  })

  it("trims whitespace before delegating", async () => {
    await resolveAssetSource("  https://example.com/img.png  ")
    expect(resolveMock).toHaveBeenCalledWith("https://example.com/img.png")
  })

  it("returns the provider resolve result", async () => {
    const result = await resolveAssetSource("asset://mock/sprite.png")
    expect(result).toBe("blob:resolved-asset://mock/sprite.png")
  })

  it("passes through https URLs via provider", async () => {
    const result = await resolveAssetSource("https://cdn.example.com/image.png")
    expect(result).toBe("https://cdn.example.com/image.png")
  })
})
