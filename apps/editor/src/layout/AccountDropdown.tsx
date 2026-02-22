import { ChevronDown, CloudUpload, Loader2, LogIn, LogOut } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "../components/ui/button.js"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../components/ui/dropdown-menu.js"
import { AuthPasswordModal } from "../features/auth/components/AuthPasswordModal.js"
import type { EditorController } from "../features/editor-state/use-editor-controller.js"

type AccountDropdownProps = {
  controller: EditorController
}

function formatRelativeTime(lastSyncedAt: Date | null): string | null {
  if (!lastSyncedAt) return null
  const diffMs = Date.now() - lastSyncedAt.getTime()
  const diffSec = Math.floor(diffMs / 1_000)
  if (diffSec < 10) return "Fa menys de 10 segons"
  if (diffSec < 30) return "Fa menys de 30 segons"
  if (diffSec < 60) return "Fa menys d'1 minut"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return diffMin === 1 ? "Fa 1 minut" : `Fa ${diffMin} minuts`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return diffH === 1 ? "Fa 1 hora" : `Fa ${diffH} hores`
  const diffD = Math.floor(diffH / 24)
  return diffD === 1 ? "Fa 1 dia" : `Fa ${diffD} dies`
}

export function AccountDropdown({ controller }: AccountDropdownProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [authError, setAuthError] = useState<string | null>(null)
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!controller.lastSyncedAt) return
    const interval = window.setInterval(() => setTick((t) => t + 1), 10_000)
    return () => window.clearInterval(interval)
  }, [controller.lastSyncedAt])

  const closeAuthModal = (): void => {
    if (isAuthSubmitting) return
    setIsAuthModalOpen(false)
    setAuthError(null)
  }

  const handleSignIn = async (): Promise<void> => {
    setIsAuthSubmitting(true)
    setAuthError(null)
    try {
      await controller.signInWithEmailPassword(authEmail, authPassword)
      setIsAuthModalOpen(false)
      setAuthPassword("")
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "No s'ha pogut iniciar sessió.")
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  const handleSignUp = async (): Promise<void> => {
    setIsAuthSubmitting(true)
    setAuthError(null)
    try {
      await controller.signUpWithEmailPassword(authEmail, authPassword)
      setIsAuthModalOpen(false)
      setAuthPassword("")
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "No s'ha pogut crear el compte.")
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  const handleGoogleSignIn = async (): Promise<void> => {
    setIsAuthSubmitting(true)
    setAuthError(null)
    try {
      await controller.signInWithGoogle()
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "No s'ha pogut iniciar sessió amb Google.")
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  const handleSignOut = async (): Promise<void> => {
    try {
      setAuthError(null)
      await controller.signOut()
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "No s'ha pogut tancar la sessió.")
    }
  }

  const syncLabel =
    controller.syncStatus === "syncing"
      ? "Pujant..."
      : controller.syncStatus === "error"
        ? "Error de sincronització"
        : formatRelativeTime(controller.lastSyncedAt)
          ? `Pujar al núvol · ${formatRelativeTime(controller.lastSyncedAt)}`
          : "Pujar al núvol"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            data-testid="header-account-trigger"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-slate-500 hover:text-slate-800"
          >
            <span
              className={`inline-block h-2 w-2 shrink-0 rounded-full ${controller.isAuthenticated ? "bg-emerald-500" : "bg-slate-300"}`}
            />
            Account
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          {controller.isAuthenticated ? (
            <>
              <DropdownMenuLabel className="truncate">{controller.authEmail ?? "Compte"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                data-testid="header-sync-item"
                disabled={controller.syncStatus === "syncing"}
                onSelect={(e) => {
                  e.preventDefault()
                  void controller.syncNow()
                }}
              >
                {controller.syncStatus === "syncing" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                ) : (
                  <CloudUpload className="h-4 w-4 text-slate-500" />
                )}
                {syncLabel}
              </DropdownMenuItem>
              {controller.syncStatus === "error" ? (
                <div className="px-2 py-1 text-xs text-red-600">No s&apos;ha pogut sincronitzar.</div>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="header-signout-item" onSelect={() => void handleSignOut()}>
                <LogOut className="h-4 w-4 text-slate-500" />
                Tancar sessió
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuLabel>Compte</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="header-signin-item" onSelect={() => setIsAuthModalOpen(true)}>
                <LogIn className="h-4 w-4 text-slate-500" />
                Iniciar sessió
              </DropdownMenuItem>
            </>
          )}
          {authError ? (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1 text-xs text-red-600">{authError}</div>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <AuthPasswordModal
        open={isAuthModalOpen}
        email={authEmail}
        password={authPassword}
        errorMessage={authError}
        isSubmitting={isAuthSubmitting}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onClose={closeAuthModal}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        onSignInWithGoogle={handleGoogleSignIn}
      />
    </>
  )
}
