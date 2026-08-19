'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { copy } from '@/lib/copy'
import type { PreparationProgress } from '@/server/services/onboarding.service'
import { PreparationSteps } from './preparation-steps'

/** İki saniyede bir yokluyoruz; hazırlık dakikalar sürüyor, daha sık sormanın anlamı yok. */
const POLL_MS = 2_000

/**
 * Hazırlık ilerlemesini izler.
 *
 * Uzun süreli bağlantı (SSE/WebSocket) kurulmuyor: iş dakikalar sürüyor,
 * iki saniyelik yoklama hem yeterli hem de ölçeklenmesi bedava.
 */
export function PreparationWatcher({
  initial,
  poll,
}: {
  initial: PreparationProgress[]
  poll: () => Promise<PreparationProgress[]>
}) {
  const [sites, setSites] = useState(initial)
  const allReady = sites.length > 0 && sites.every((site) => site.stage === 'ready')

  useEffect(() => {
    if (allReady) return

    const timer = setInterval(() => {
      void poll().then(setSites)
    }, POLL_MS)

    return () => clearInterval(timer)
  }, [allReady, poll])

  return (
    <div>
      <ul className="space-y-6">
        {sites.map((site) => (
          <li key={site.siteId} className="rounded-(--radius) bg-paper-raised p-5 ring-1 ring-rule">
            <h2 className="mb-4 font-display text-base font-semibold break-all">
              {site.stage === 'ready' ? site.displayName : copy.onboarding.preparingTitle(site.displayName)}
            </h2>
            <PreparationSteps stage={site.stage} />
          </li>
        ))}
      </ul>

      <div className="mt-8">
        {allReady ? (
          <>
            <p className="mb-4 text-sm font-medium text-rise">{copy.onboarding.allReady}</p>
            <Link
              href="/genel-bakis"
              className="inline-block rounded-(--radius) bg-cobalt px-6 py-3 font-display text-base font-semibold text-white transition-transform hover:-translate-y-px"
            >
              {copy.onboarding.goToDashboard}
            </Link>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-ink-muted">{copy.onboarding.preparingNote}</p>
        )}
      </div>
    </div>
  )
}
