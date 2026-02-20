import type { KvStorageProvider } from "./kv-storage-provider.js"

export class LocalStorageKvProvider implements KvStorageProvider {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }

  setItem(key: string, value: string): void {
    localStorage.setItem(key, value)
  }

  removeItem(key: string): void {
    localStorage.removeItem(key)
  }
}
