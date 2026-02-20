import { type FormEvent } from "react"
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
  onSignUp
}: AuthPasswordModalProps) {
  if (!open) {
    return null
  }

  const handleSignInSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    void onSignIn()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        data-testid="auth-signin-modal"
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="auth-modal-title" className="text-base font-semibold text-slate-900">
          Inicia sessio
        </h2>
        <p className="mt-1 text-sm text-slate-600">Entra amb correu i contrasenya.</p>
        <form className="mt-4 space-y-3" onSubmit={handleSignInSubmit}>
          <div>
            <label htmlFor="auth-email-input" className="mb-1 block text-xs font-medium text-slate-700">
              Correu electronic
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
            />
          </div>
          <div>
            <label htmlFor="auth-password-input" className="mb-1 block text-xs font-medium text-slate-700">
              Contrasenya
            </label>
            <Input
              id="auth-password-input"
              data-testid="auth-password-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Minim 6 caracters"
              disabled={isSubmitting}
            />
          </div>
          {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="auth-cancel-button"
              disabled={isSubmitting}
              onClick={() => onClose()}
            >
              Cancela
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="auth-signup-button"
              disabled={isSubmitting}
              onClick={() => void onSignUp()}
            >
              Crear compte
            </Button>
            <Button type="submit" size="sm" data-testid="auth-signin-button" disabled={isSubmitting}>
              {isSubmitting ? "Entrant..." : "Entrar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
