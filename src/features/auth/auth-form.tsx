'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { copy } from '@/lib/copy'
import type { AuthFormState } from './actions'

function Field({
  name,
  label,
  type,
  hint,
  required = true,
  autoComplete,
}: {
  name: string
  label: string
  type: string
  hint?: string
  required?: boolean
  autoComplete: string
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="text-xs text-ink-faint">{hint}</span> : null}
      </span>

      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="mt-1.5 w-full rounded-(--radius) bg-paper-raised px-3 py-2.5 text-sm ring-1 ring-rule focus:ring-cobalt"
      />
    </label>
  )
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-(--radius) bg-cobalt px-6 py-3 font-display text-base font-semibold text-white transition-transform hover:-translate-y-px disabled:translate-y-0 disabled:opacity-60"
    >
      {pending ? copy.auth.working : label}
    </button>
  )
}

/**
 * Giriş ve kayıt aynı bileşen: alanlar neredeyse aynı ve iki ayrı form
 * yazmak ikisinin zamanla birbirinden sapmasına yol açar.
 */
export function AuthForm({
  mode,
  action,
}: {
  mode: 'signIn' | 'signUp'
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>
}) {
  const [state, formAction] = useActionState(action, { error: null })
  const signUp = mode === 'signUp'

  return (
    <form action={formAction} className="space-y-4">
      {signUp ? (
        <Field
          name="name"
          label={copy.auth.nameLabel}
          hint={copy.auth.nameOptional}
          type="text"
          required={false}
          autoComplete="name"
        />
      ) : null}

      <Field name="email" label={copy.auth.emailLabel} type="email" autoComplete="email" />

      <Field
        name="password"
        label={copy.auth.passwordLabel}
        type="password"
        autoComplete={signUp ? 'new-password' : 'current-password'}
      />

      {state.error ? (
        <p
          role="alert"
          className="rounded-(--radius) border-l-2 border-fall bg-paper-raised px-4 py-3 text-sm"
        >
          {state.error}
        </p>
      ) : null}

      <div className="pt-1">
        <Submit label={signUp ? copy.auth.signUpAction : copy.auth.signInAction} />
      </div>
    </form>
  )
}
