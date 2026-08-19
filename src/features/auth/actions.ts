'use server'

import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'
import { copy } from '@/lib/copy'
import { signIn } from '@/server/auth'
import { registrationService } from '@/server/services/registration.service'

export type AuthFormState = { error: string | null }

const readEmail = (formData: FormData) => String(formData.get('email') ?? '').trim().toLowerCase()
const readPassword = (formData: FormData) => String(formData.get('password') ?? '')

export async function signInAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = readEmail(formData)
  const password = readPassword(formData)

  try {
    await signIn('credentials', { email, password, redirect: false })
  } catch (error) {
    /**
     * Kullanıcı yok, parola yanlış, hesap parolasız — hepsi aynı mesajı
     * döndürür. Ayrıntı vermek hangi e-postaların kayıtlı olduğunu
     * sızdırır ve saldırgana liste çıkarma imkânı verir.
     */
    if (error instanceof AuthError) return { error: copy.auth.wrongCredentials }
    throw error
  }

  redirect('/genel-bakis')
}

export async function signUpAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = readEmail(formData)
  const password = readPassword(formData)

  const result = await registrationService.register({
    email,
    password,
    name: String(formData.get('name') ?? '').trim(),
  })

  if (!result.ok) {
    if (result.reason === 'email_taken') return { error: copy.auth.emailTaken }
    if (result.reason === 'email_invalid') return { error: copy.auth.emailInvalid }
    return { error: result.detail ?? copy.auth.wrongCredentials }
  }

  // Kayıttan sonra kullanıcıyı bir de giriş ekranına göndermek gereksiz.
  await signIn('credentials', { email, password, redirect: false })

  redirect('/genel-bakis')
}
