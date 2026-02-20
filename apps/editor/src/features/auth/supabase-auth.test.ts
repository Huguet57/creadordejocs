import { describe, expect, it, vi } from "vitest"
import {
  getSupabaseAuthUser,
  signInWithEmailPassword,
  signInWithGoogle,
  signUpWithEmailPassword,
  signOutFromSupabase,
  subscribeToSupabaseAuthUser
} from "./supabase-auth.js"

type BrowserWindowLike = {
  location: {
    href?: string
    origin: string
    pathname?: string
    search?: string
    hash?: string
  }
  history?: {
    replaceState: (data: unknown, unused: string, url?: string) => void
  }
}

async function withWindow<T>(windowMock: BrowserWindowLike, fn: () => Promise<T>): Promise<T> {
  const previousWindow = (globalThis as { window?: unknown }).window
  ;(globalThis as { window?: unknown }).window = windowMock
  try {
    return await fn()
  } finally {
    ;(globalThis as { window?: unknown }).window = previousWindow
  }
}

describe("supabase-auth", () => {
  it("returns current auth user from session when session exists", async () => {
    const getUser = vi.fn()
    const getSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
            email: "user@example.com"
          }
        }
      },
      error: null
    })
    const exchangeCodeForSession = vi.fn()
    const setSession = vi.fn()

    const client = {
      auth: {
        exchangeCodeForSession,
        setSession,
        getSession,
        getUser
      }
    } as unknown as Parameters<typeof getSupabaseAuthUser>[0]

    const result = await getSupabaseAuthUser(client)

    expect(result).toEqual({ id: "user-1", email: "user@example.com" })
    expect(getUser).not.toHaveBeenCalled()
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    expect(setSession).not.toHaveBeenCalled()
  })

  it("falls back to getUser when session is empty", async () => {
    const getSession = vi.fn().mockResolvedValue({
      data: { session: null },
      error: null
    })
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-2",
          email: "fallback@example.com"
        }
      },
      error: null
    })
    const exchangeCodeForSession = vi.fn()
    const setSession = vi.fn()

    const client = {
      auth: {
        exchangeCodeForSession,
        setSession,
        getSession,
        getUser
      }
    } as unknown as Parameters<typeof getSupabaseAuthUser>[0]

    const result = await getSupabaseAuthUser(client)

    expect(result).toEqual({ id: "user-2", email: "fallback@example.com" })
    expect(getUser).toHaveBeenCalledTimes(1)
  })

  it("returns null when auth session is missing", async () => {
    const getSession = vi.fn().mockResolvedValue({
      data: { session: null },
      error: null
    })
    const getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: "Auth session missing!" }
    })
    const exchangeCodeForSession = vi.fn()
    const setSession = vi.fn()

    const client = {
      auth: {
        exchangeCodeForSession,
        setSession,
        getSession,
        getUser
      }
    } as unknown as Parameters<typeof getSupabaseAuthUser>[0]

    await expect(getSupabaseAuthUser(client)).resolves.toBeNull()
  })

  it("exchanges OAuth callback code before loading session", async () => {
    const replaceState = vi.fn()
    const getSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          user: {
            id: "oauth-user",
            email: "oauth@example.com"
          }
        }
      },
      error: null
    })
    const getUser = vi.fn()
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null })
    const setSession = vi.fn()

    const client = {
      auth: {
        exchangeCodeForSession,
        setSession,
        getSession,
        getUser
      }
    } as unknown as Parameters<typeof getSupabaseAuthUser>[0]

    await withWindow(
      {
        location: {
          href: "http://localhost:5173/editor?code=oauth-code&state=abc",
          origin: "http://localhost:5173",
          pathname: "/editor",
          search: "?code=oauth-code&state=abc",
          hash: ""
        },
        history: {
          replaceState
        }
      },
      async () => {
        await expect(getSupabaseAuthUser(client)).resolves.toEqual({
          id: "oauth-user",
          email: "oauth@example.com"
        })
      }
    )

    expect(exchangeCodeForSession).toHaveBeenCalledWith("oauth-code")
    expect(replaceState).toHaveBeenCalledWith({}, "", "/editor")
  })

  it("sets session from oauth hash tokens before loading session", async () => {
    const replaceState = vi.fn()
    const getSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          user: {
            id: "implicit-user",
            email: "implicit@example.com"
          }
        }
      },
      error: null
    })
    const getUser = vi.fn()
    const exchangeCodeForSession = vi.fn()
    const setSession = vi.fn().mockResolvedValue({ error: null })

    const client = {
      auth: {
        exchangeCodeForSession,
        setSession,
        getSession,
        getUser
      }
    } as unknown as Parameters<typeof getSupabaseAuthUser>[0]

    await withWindow(
      {
        location: {
          href: "http://localhost:5173/editor#access_token=token-123&refresh_token=refresh-456&type=bearer",
          origin: "http://localhost:5173",
          pathname: "/editor",
          search: "",
          hash: "#access_token=token-123&refresh_token=refresh-456&type=bearer"
        },
        history: {
          replaceState
        }
      },
      async () => {
        await expect(getSupabaseAuthUser(client)).resolves.toEqual({
          id: "implicit-user",
          email: "implicit@example.com"
        })
      }
    )

    expect(setSession).toHaveBeenCalledWith({
      access_token: "token-123",
      refresh_token: "refresh-456"
    })
    expect(replaceState).toHaveBeenCalledWith({}, "", "/editor")
    expect(getUser).not.toHaveBeenCalled()
  })

  it("surfaces OAuth callback errors instead of failing silently", async () => {
    const replaceState = vi.fn()
    const getSession = vi.fn()
    const getUser = vi.fn()
    const exchangeCodeForSession = vi.fn()
    const setSession = vi.fn()
    const client = {
      auth: {
        exchangeCodeForSession,
        setSession,
        getSession,
        getUser
      }
    } as unknown as Parameters<typeof getSupabaseAuthUser>[0]

    await withWindow(
      {
        location: {
          href: "http://localhost:5173/editor?error=access_denied&error_description=Consent%20rejected",
          origin: "http://localhost:5173",
          pathname: "/editor",
          search: "?error=access_denied&error_description=Consent%20rejected",
          hash: ""
        },
        history: {
          replaceState
        }
      },
      async () => {
        await expect(getSupabaseAuthUser(client)).rejects.toThrow("Could not complete OAuth sign in: access_denied")
      }
    )

    expect(getSession).not.toHaveBeenCalled()
    expect(getUser).not.toHaveBeenCalled()
    expect(replaceState).toHaveBeenCalledWith({}, "", "/editor")
  })

  it("subscribes to auth state change and returns unsubscribe", () => {
    const unsubscribe = vi.fn()
    const onAuthStateChange = vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe } }
    })

    const client = {
      auth: {
        onAuthStateChange
      }
    } as unknown as Parameters<typeof subscribeToSupabaseAuthUser>[0]

    const onChange = vi.fn()
    const teardown = subscribeToSupabaseAuthUser(client, onChange)

    const callback = onAuthStateChange.mock.calls[0]?.[0] as
      | ((event: string, session: { user: { id: string; email: string | null } | null } | null) => void)
      | undefined
    if (callback) {
      callback("SIGNED_IN", { user: { id: "user-2", email: null } })
    }

    expect(onChange).toHaveBeenCalledWith({ id: "user-2", email: null })

    teardown()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it("signs in with email and password", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ error: null })
    const client = {
      auth: {
        signInWithPassword
      }
    } as unknown as Parameters<typeof signInWithEmailPassword>[0]

    await signInWithEmailPassword(client, "  user@example.com ", "secret-pass")

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret-pass"
    })
  })

  it("signs up with email and password", async () => {
    const signUp = vi.fn().mockResolvedValue({ error: null })
    const client = {
      auth: {
        signUp
      }
    } as unknown as Parameters<typeof signUpWithEmailPassword>[0]

    await signUpWithEmailPassword(client, "new-user@example.com", "secret-pass")

    expect(signUp).toHaveBeenCalledWith({
      email: "new-user@example.com",
      password: "secret-pass"
    })
  })

  it("starts Google OAuth sign-in request", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ error: null })
    const client = {
      auth: {
        signInWithOAuth
      }
    } as unknown as Parameters<typeof signInWithGoogle>[0]

    await signInWithGoogle(client)

    expect(signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: "google" }))
  })

  it("uses /editor as fallback Google redirect when env is unset", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ error: null })
    const client = {
      auth: {
        signInWithOAuth
      }
    } as unknown as Parameters<typeof signInWithGoogle>[0]

    await withWindow(
      {
        location: {
          origin: "http://localhost:5173"
        }
      },
      async () => {
        await signInWithGoogle(client)
      }
    )

    expect(signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "google",
        options: {
          redirectTo: "http://localhost:5173/editor"
        }
      })
    )
  })

  it("signs out current user", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null })
    const client = {
      auth: {
        signOut
      }
    } as unknown as Parameters<typeof signOutFromSupabase>[0]

    await signOutFromSupabase(client)
    expect(signOut).toHaveBeenCalled()
  })
})
