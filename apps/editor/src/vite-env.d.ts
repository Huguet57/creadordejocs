/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ASSET_STORAGE_PROVIDER?: "indexeddb" | "supabase"
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SUPABASE_BUCKET?: string
  readonly VITE_ENABLE_SUPABASE_AUTH?: string
  readonly VITE_SUPABASE_AUTH_REDIRECT_TO?: string
  readonly VITE_SHARE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
