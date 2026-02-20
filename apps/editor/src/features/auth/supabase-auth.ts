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
