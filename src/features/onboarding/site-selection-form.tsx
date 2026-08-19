'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { copy } from '@/lib/copy'
import type { DiscoveredSite } from '@/server/services/onboarding.service'
import { addSelectedSites } from './actions'

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-(--radius) bg-cobalt px-6 py-3 font-display text-base font-semibold text-white transition-transform hover:-translate-y-px disabled:translate-y-0 disabled:opacity-50"
    >
      {pending ? copy.onboarding.adding : copy.onboarding.addAction}
    </button>
  )
}

/**
 * Site seçim listesi.
 *
 * Zaten eklenmiş siteler listede kalır ama seçilemez — kullanıcının
 * "bunu eklemiş miydim" diye düşünmesine gerek kalmaz.
 */
export function SiteSelectionForm({ sites }: { sites: DiscoveredSite[] }) {
  const selectable = sites.filter((site) => !site.alreadyAdded)
  const [selected, setSelected] = useState<string[]>(() => selectable.map((site) => site.property))

  return (
    <form action={addSelectedSites}>
      <ul className="divide-y divide-rule overflow-hidden rounded-(--radius) ring-1 ring-rule">
        {sites.map((site) => (
          <li key={site.property}>
            <label
              className={`flex items-center gap-3 bg-paper-raised px-4 py-3.5 ${
                site.alreadyAdded ? 'opacity-55' : 'cursor-pointer hover:bg-cobalt-soft/40'
              }`}
            >
              <input
                type="checkbox"
                name="site"
                value={site.property}
                disabled={site.alreadyAdded}
                checked={site.alreadyAdded || selected.includes(site.property)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, site.property]
                      : current.filter((value) => value !== site.property),
                  )
                }
                className="size-4 accent-[var(--cobalt)]"
              />

              <span className="flex-1 text-sm font-medium">{site.displayName}</span>

              {site.alreadyAdded ? (
                <span className="text-xs text-ink-faint">{copy.onboarding.alreadyAdded}</span>
              ) : null}
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <SubmitButton disabled={selected.length === 0} />

        {selected.length === 0 ? (
          <p className="text-sm text-ink-faint">{copy.onboarding.selectAtLeastOne}</p>
        ) : null}
      </div>
    </form>
  )
}
