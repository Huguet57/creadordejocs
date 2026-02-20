import { describe, expect, it, vi } from "vitest"
import {
  getSupabaseAuthUser,
  signInWithEmailPassword,
  signUpWithEmailPassword,
  signOutFromSupabase,
  subscribeToSupabaseAuthUser
} from "./supabase-auth.js"

describe("supabase-auth", () => {
  it("returns current auth user when session exists", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "user@example.com"
        }
      },
      error: null
    })

    const client = {
      auth: {
        getUser
      }
    } as unknown as Parameters<typeof getSupabaseAuthUser>[0]

    const result = await getSupabaseAuthUser(client)

    expect(result).toEqual({ id: "user-1", email: "user@example.com" })
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
