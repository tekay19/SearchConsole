'use client'

import { useFormStatus } from 'react-dom'
import { copy } from '@/lib/copy'

function Submit({ className }: { className: string }) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending} className={className}>
      {copy.accounts.addAccount}
    </button>
  )
}

/**
 * Yeni Google hesabı bağlar.
 *
 * Sunucu eylemi kullanmak zorunlu: Google'a gitmeden önce "bu ekleme
 * şu kullanıcıya ait" niyetinin sunucuda kaydedilmesi gerekiyor, yoksa
 * dönüşte hesap yeni bir kullanıcı olarak açılır.
 */
export function AddAccountButton({
  action,
  className = 'text-sm font-medium text-cobalt underline-offset-4 hover:underline disabled:opacity-60',
}: {
  action: () => Promise<void>
  className?: string
}) {
  return (
    <form action={action}>
      <Submit className={className} />
    </form>
  )
}
