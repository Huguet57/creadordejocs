import { type FormEvent, useState } from "react"
import { Button } from "../../../components/ui/button.js"
import { Input } from "../../../components/ui/input.js"

type AuthPasswordModalProps = {
  open: boolean
  email: string
  password: string
  errorMessage: string | null
  isSubmitting: boolean
  onEmailChange: (email: string) => void
  onPasswordChange: (password: string) => void
  onClose: () => void
  onSignIn: () => Promise<void> | void
  onSignUp: () => Promise<void> | void
  onSignInWithGoogle: () => Promise<void> | void
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  )
}

export function AuthPasswordModal({
  open,
  email,
  password,
  errorMessage,
  isSubmitting,
  onEmailChange,
  onPasswordChange,
  onClose,
  onSignIn,
  onSignUp,
  onSignInWithGoogle
}: AuthPasswordModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin")

  if (!open) {
    return null
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (mode === "signup") {
      void onSignUp()
    } else {
      void onSignIn()
    }
  }

  const isSignUp = mode === "signup"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        data-testid="auth-signin-modal"
        className="w-full max-w-sm animate-in fade-in zoom-in-95 rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-2 text-center">
          <h2 id="auth-modal-title" className="text-lg font-semibold text-slate-900">
            {isSignUp ? "Crea un compte" : "Inicia sessió"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isSignUp ? "Registra't per desar els teus jocs." : "Entra per desar i compartir els teus jocs."}
          </p>
        </div>

        <div className="px-6 pb-6">
          {/* Social login — most frictionless option first */}
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              data-testid="auth-google-button"
              className="h-10 w-full gap-2 text-sm font-medium"
              disabled={isSubmitting}
              onClick={() => void onSignInWithGoogle()}
            >
              <GoogleIcon />
              Continua amb Google
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400">o bé amb correu</span>
            </div>
          </div>

          {/* Email/password form */}
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="auth-email-input" className="mb-1.5 block text-sm font-medium text-slate-700">
                Correu electrònic
              </label>
              <Input
                id="auth-email-input"
                data-testid="auth-email-input"
                type="email"
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="nom@exemple.com"
                disabled={isSubmitting}
                className="h-10"
              />
            </div>
            <div>
              <label htmlFor="auth-password-input" className="mb-1.5 block text-sm font-medium text-slate-700">
                Contrasenya
              </label>
              <Input
                id="auth-password-input"
                data-testid="auth-password-input"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder={isSignUp ? "Mínim 6 caràcters" : "La teva contrasenya"}
                disabled={isSubmitting}
                className="h-10"
              />
            </div>

            {errorMessage ? (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</div>
            ) : null}

            <Button
              type="submit"
              data-testid="auth-signin-button"
              className="h-10 w-full text-sm font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (isSignUp ? "Creant compte..." : "Entrant...") : isSignUp ? "Crear compte" : "Entrar"}
            </Button>
          </form>

          {/* Toggle sign in / sign up */}
          <p className="mt-4 text-center text-sm text-slate-500">
            {isSignUp ? "Ja tens un compte?" : "No tens compte?"}{" "}
            <button
              type="button"
              data-testid="auth-signup-button"
              className="font-medium text-slate-900 underline-offset-2 hover:underline"
              disabled={isSubmitting}
              onClick={() => setMode(isSignUp ? "signin" : "signup")}
            >
              {isSignUp ? "Inicia sessió" : "Crea'n un"}
            </button>
          </p>
        </div>

        {/* Footer cancel */}
        <div className="border-t border-slate-100 px-6 py-3">
          <button
            type="button"
            data-testid="auth-cancel-button"
            className="w-full text-center text-sm text-slate-400 transition-colors hover:text-slate-600"
            disabled={isSubmitting}
            onClick={() => onClose()}
          >
            Cancela
          </button>
        </div>
      </div>
    </div>
  )
}
