'use client'

import { useFormStatus } from 'react-dom'
import { copy } from '@/lib/copy'

function Submit() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-(--radius) bg-cobalt px-6 py-3.5 font-display text-base font-semibold text-white transition-transform hover:-translate-y-px active:translate-y-0 disabled:translate-y-0 disabled:opacity-60"
    >
      {copy.onboarding.connectAction}
    </button>
  )
}

/**
 * Girişi sunucu tarafında başlatır.
 *
 * İstemciden `signIn()` çağırmak yerine sunucu eylemi kullanıyoruz:
 * hesap ekleme akışı Google'a gitmeden önce sunucuda bir niyet kaydı
 * bırakmak zorunda ve iki akışın aynı kapıdan geçmesi, birinin
 * diğerinden sapmasını engelliyor.
 */
export function ConnectButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <Submit />
    </form>
  )
}
