import { hashPassword, passwordProblem } from '@/server/auth/password'
import { usersRepo } from '@/server/repositories/users.repo'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type RegistrationResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'email_invalid' | 'email_taken' | 'password_weak'; detail?: string }

export const registrationService = {
  /**
   * Yeni hesap açar.
   *
   * Parola özeti burada üretilir; düz parola veritabanına, günlüğe veya
   * hata mesajına hiçbir yolla ulaşmaz.
   */
  async register(input: { email: string; name: string | null; password: string }): Promise<RegistrationResult> {
    const email = input.email.trim().toLowerCase()

    if (!EMAIL_PATTERN.test(email)) return { ok: false, reason: 'email_invalid' }

    const problem = passwordProblem(input.password)
    if (problem) return { ok: false, reason: 'password_weak', detail: problem }

    const created = await usersRepo.create({
      email,
      name: input.name && input.name.length > 0 ? input.name : null,
      passwordHash: await hashPassword(input.password),
    })

    // Tekillik kısıtı çakıştıysa kayıt açılmadı: adres zaten kullanımda.
    if (!created) return { ok: false, reason: 'email_taken' }

    return { ok: true, userId: created.id }
  },
}
