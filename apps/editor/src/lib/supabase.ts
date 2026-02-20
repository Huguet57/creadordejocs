import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let supabaseClientSingleton: SupabaseClient | null | undefined

function readSupabaseCredentials(): { url: string; anonKey: string } | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey
  }
}

export function getSupabaseBucketName(): string {
  const bucket = import.meta.env.VITE_SUPABASE_BUCKET?.trim()
  if (!bucket) {
    throw new Error("Missing VITE_SUPABASE_BUCKET. Configure apps/editor/.env.local.")
  }
  return bucket
}

export function createSupabaseClientFromEnv() {
  const credentials = readSupabaseCredentials()

  if (!credentials?.url) {
    throw new Error("Missing VITE_SUPABASE_URL. Configure apps/editor/.env.local.")
  }

  if (!credentials.anonKey) {
    throw new Error("Missing VITE_SUPABASE_ANON_KEY. Configure apps/editor/.env.local.")
  }

  return createClient(credentials.url, credentials.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClientSingleton !== undefined) {
    return supabaseClientSingleton
  }

  const isAuthEnabled = import.meta.env.VITE_ENABLE_SUPABASE_AUTH !== "false"
  const credentials = readSupabaseCredentials()
  if (!isAuthEnabled || !credentials) {
    supabaseClientSingleton = null
    return supabaseClientSingleton
  }

  supabaseClientSingleton = createClient(credentials.url, credentials.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })

  return supabaseClientSingleton
}

export function resetSupabaseClientSingleton(): void {
  supabaseClientSingleton = undefined
}
