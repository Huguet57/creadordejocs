/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ASSET_STORAGE_PROVIDER?: "indexeddb" | "supabase"
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SUPABASE_BUCKET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
