import type { KvStorageProvider } from "./kv-storage-provider.js"
import { LocalStorageKvProvider } from "./local-storage-provider.js"

let instance: KvStorageProvider | null = null

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
