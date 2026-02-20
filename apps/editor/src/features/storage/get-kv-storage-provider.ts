import { IndexedDbKvProvider } from "./indexeddb-kv-provider.js"
import type { KvStorageProvider } from "./kv-storage-provider.js"
import { LocalStorageKvProvider } from "./local-storage-provider.js"

let instance: KvStorageProvider | null = null

/**
 * Initialises the KV storage provider with IndexedDB.
 * Must be called (and awaited) before the app renders.
 * Falls back to localStorage silently on failure.
 */
export async function initKvStorageProvider(): Promise<void> {
  try {
    const provider = new IndexedDbKvProvider()
    await provider.init()
    instance = provider
  } catch {
    instance = new LocalStorageKvProvider()
  }
}

export function getKvStorageProvider(): KvStorageProvider {
  if (instance) {
    return instance
  }
  instance = new LocalStorageKvProvider()
  return instance
}

/** For tests. Injects a custom provider. */
export function setKvStorageProvider(provider: KvStorageProvider): void {
  instance = provider
}

/** For tests. Resets the singleton so a fresh provider is created on next access. */
export function resetKvStorageProvider(): void {
  instance = null
}
