import type { Session, SupabaseClient } from "@supabase/supabase-js"

export type SupabaseAuthUser = {
  id: string
  email: string | null
}

function noopUnsubscribe(): void {
  // noop
}

function resolveUserFromSession(session: Session | null): SupabaseAuthUser | null {
  const user = session?.user
  if (!user) {
    return null
  }
  return {
    id: user.id,
    email: user.email ?? null
  }
}

export async function getSupabaseAuthUser(client: SupabaseClient | null): Promise<SupabaseAuthUser | null> {
  if (!client) {
    return null
  }

  const { data, error } = await client.auth.getUser()
  if (error) {
    throw new Error(`Could not get Supabase user: ${error.message}`)
  }

  if (!data.user) {
    return null
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null
  }
}

export function subscribeToSupabaseAuthUser(
  client: SupabaseClient | null,
  onChange: (user: SupabaseAuthUser | null) => void
): () => void {
  if (!client) {
    return noopUnsubscribe
  }

  const {
    data: { subscription }
  } = client.auth.onAuthStateChange((_event, session) => {
    onChange(resolveUserFromSession(session))
  })

  return () => {
    subscription.unsubscribe()
  }
}

function normalizeAuthCredentials(email: string, password: string): { email: string; password: string } {
  const trimmedEmail = email.trim()
  if (!trimmedEmail) {
    throw new Error("Email is required.")
  }
  if (!password || password.length < 6) {
    throw new Error("Password must have at least 6 characters.")
  }
  return { email: trimmedEmail, password }
}

export async function signInWithEmailPassword(client: SupabaseClient | null, email: string, password: string): Promise<void> {
  if (!client) {
    throw new Error("Supabase auth is not configured.")
  }

  const credentials = normalizeAuthCredentials(email, password)
  const { error } = await client.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password
  })

  if (error) {
    throw new Error(`Could not sign in: ${error.message}`)
  }
}

export async function signUpWithEmailPassword(client: SupabaseClient | null, email: string, password: string): Promise<void> {
  if (!client) {
    throw new Error("Supabase auth is not configured.")
  }

  const credentials = normalizeAuthCredentials(email, password)
  const { error } = await client.auth.signUp({
    email: credentials.email,
    password: credentials.password
  })

  if (error) {
    throw new Error(`Could not sign up: ${error.message}`)
  }
}

export async function signInWithGoogle(client: SupabaseClient | null): Promise<void> {
  if (!client) {
    throw new Error("Supabase auth is not configured.")
  }

  const redirectTo = import.meta.env.VITE_SUPABASE_AUTH_REDIRECT_TO
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    ...(redirectTo
      ? {
          options: {
            redirectTo
          }
        }
      : {})
  })

  if (error) {
    throw new Error(`Could not sign in with Google: ${error.message}`)
  }
}

export async function signOutFromSupabase(client: SupabaseClient | null): Promise<void> {
  if (!client) {
    return
  }

  const { error } = await client.auth.signOut()
  if (error) {
    throw new Error(`Could not sign out: ${error.message}`)
  }
}
