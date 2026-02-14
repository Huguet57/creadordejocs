import { createClient } from "@supabase/supabase-js"

export function getSupabaseBucketName(): string {
  const bucket = import.meta.env.VITE_SUPABASE_BUCKET?.trim()
  if (!bucket) {
    throw new Error("Missing VITE_SUPABASE_BUCKET. Configure apps/editor/.env.local.")
  }
  return bucket
}

export function createSupabaseClientFromEnv() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error("Missing VITE_SUPABASE_URL. Configure apps/editor/.env.local.")
  }

  if (!supabaseAnonKey) {
    throw new Error("Missing VITE_SUPABASE_ANON_KEY. Configure apps/editor/.env.local.")
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}
