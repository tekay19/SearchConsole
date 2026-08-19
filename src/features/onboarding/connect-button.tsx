'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { copy } from '@/lib/copy'

export function ConnectButton() {
  const [busy, setBusy] = useState(false)

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true)
        void signIn('google', { callbackUrl: '/siteler/sec' })
      }}
      className="inline-flex w-full items-center justify-center rounded-(--radius) bg-cobalt px-6 py-3.5 font-display text-base font-semibold text-white transition-transform hover:-translate-y-px active:translate-y-0 disabled:translate-y-0 disabled:opacity-60"
    >
      {copy.onboarding.connectAction}
    </button>
  )
}
