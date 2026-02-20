import type { Session, SupabaseClient } from "@supabase/supabase-js"

export type SupabaseAuthUser = {
  id: string
  email: string | null
}

function noopUnsubscribe(): void {
  // noop
}

const AUTH_CALLBACK_PARAM_KEYS = [
  "access_token",
  "code",
  "error",
  "error_code",
  "error_description",
  "expires_at",
  "expires_in",
  "id_token",
  "provider_refresh_token",
  "provider_token",
  "refresh_token",
  "state",
  "token_type",
  "type"
] as const

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

function normalizeSearch(value: string): string {
  if (!value) {
    return ""
  }
  return value.startsWith("?") ? value.slice(1) : value
}

function normalizeHash(value: string): string {
  if (!value) {
    return ""
  }
  return value.startsWith("#") ? value.slice(1) : value
}

function getAuthCallbackCodeFromWindow(): string | null {
  if (typeof window === "undefined") {
    return null
  }
  const params = new URLSearchParams(normalizeSearch(window.location.search))
  return params.get("code")
}

function getAuthCallbackErrorFromWindow(): string | null {
  if (typeof window === "undefined") {
    return null
  }

  const searchParams = new URLSearchParams(normalizeSearch(window.location.search))
  const hashParams = new URLSearchParams(normalizeHash(window.location.hash))
  const combinedError = searchParams.get("error") ?? hashParams.get("error")
  if (!combinedError) {
    return null
  }
  const description =
    searchParams.get("error_description") ??
    hashParams.get("error_description") ??
    searchParams.get("error_code") ??
    hashParams.get("error_code")
  return description ? `${combinedError}: ${description}` : combinedError
}

function getAuthTokensFromWindowHash(): { accessToken: string; refreshToken: string } | null {
  if (typeof window === "undefined") {
    return null
  }
  const hashParams = new URLSearchParams(normalizeHash(window.location.hash))
  const accessToken = hashParams.get("access_token")
  const refreshToken = hashParams.get("refresh_token")
  if (!accessToken || !refreshToken) {
    return null
  }
  return { accessToken, refreshToken }
}

function cleanupAuthCallbackParamsFromWindow(): void {
  if (typeof window === "undefined") {
    return
  }

  const current = new URL(window.location.href)
  let didChange = false

  for (const key of AUTH_CALLBACK_PARAM_KEYS) {
    if (current.searchParams.has(key)) {
      current.searchParams.delete(key)
      didChange = true
    }
  }

  if (current.hash) {
    const hashParams = new URLSearchParams(normalizeHash(current.hash))
    let hashChanged = false
    for (const key of AUTH_CALLBACK_PARAM_KEYS) {
      if (hashParams.has(key)) {
        hashParams.delete(key)
        hashChanged = true
      }
    }
    if (hashChanged) {
      const nextHash = hashParams.toString()
      current.hash = nextHash ? `#${nextHash}` : ""
      didChange = true
    }
  }

  if (!didChange) {
    return
  }

  const next = `${current.pathname}${current.search}${current.hash}`
  window.history.replaceState({}, "", next)
}

function isMissingAuthSessionError(errorMessage: string | undefined): boolean {
  if (!errorMessage) {
    return false
  }
  return errorMessage.toLowerCase().includes("auth session missing")
}

function resolveGoogleOAuthRedirectTo(): string | undefined {
  const configuredRedirectTo = import.meta.env.VITE_SUPABASE_AUTH_REDIRECT_TO?.trim()
  if (configuredRedirectTo) {
    return configuredRedirectTo
  }
  if (typeof window === "undefined") {
    return undefined
  }
  return `${window.location.origin}/editor`
}

export async function getSupabaseAuthUser(client: SupabaseClient | null): Promise<SupabaseAuthUser | null> {
  if (!client) {
    return null
  }

  const oauthError = getAuthCallbackErrorFromWindow()
  if (oauthError) {
    cleanupAuthCallbackParamsFromWindow()
    throw new Error(`Could not complete OAuth sign in: ${oauthError}`)
  }

  const authCode = getAuthCallbackCodeFromWindow()
  if (authCode) {
    const { error: exchangeError } = await client.auth.exchangeCodeForSession(authCode)
    if (exchangeError) {
      cleanupAuthCallbackParamsFromWindow()
      throw new Error(`Could not complete OAuth sign in: ${exchangeError.message}`)
    }
    cleanupAuthCallbackParamsFromWindow()
  }

  const authTokens = getAuthTokensFromWindowHash()
  if (authTokens) {
    const { error: setSessionError } = await client.auth.setSession({
      access_token: authTokens.accessToken,
      refresh_token: authTokens.refreshToken
    })
    if (setSessionError) {
      cleanupAuthCallbackParamsFromWindow()
      throw new Error(`Could not complete OAuth sign in: ${setSessionError.message}`)
    }
    cleanupAuthCallbackParamsFromWindow()
  }

  const { data: sessionData, error: sessionError } = await client.auth.getSession()
  if (sessionError) {
    if (isMissingAuthSessionError(sessionError.message)) {
      return null
    }
    throw new Error(`Could not get Supabase session: ${sessionError.message}`)
  }

  const sessionUser = resolveUserFromSession(sessionData.session)
  if (sessionUser) {
    return sessionUser
  }

  const { data, error } = await client.auth.getUser()
  if (error) {
    if (isMissingAuthSessionError(error.message)) {
      return null
    }
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

  const redirectTo = resolveGoogleOAuthRedirectTo()
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
