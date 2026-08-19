import Link from 'next/link'
import { copy } from '@/lib/copy'
import type { SiteStatusView } from '@/server/services/site-status'

const LABELS = {
  fresh: copy.status.fresh,
  syncing: copy.status.syncing,
  needs_reconnect: copy.status.needsReconnect,
  failed: copy.status.failed,
} as const

const DOT_TONE = {
  fresh: 'bg-rise',
  syncing: 'bg-cobalt',
  needs_reconnect: 'bg-fall',
  failed: 'bg-fall',
} as const

/**
 * Site durumu ve kullanıcının yapabileceği tek şey.
 *
 * Hata kodu, HTTP durumu, istisna mesajı buraya hiç ulaşmaz — dört
 * durumdan birine indirgenmiş hâli gelir (bkz. site-status.ts).
 *
 * Yeniden deneme eylemi prop olarak geliyor, içeriden import edilmiyor:
 * aksi halde bu yaprak bileşen tüm kimlik doğrulama yığınını beraberinde
 * taşırdı ve tek başına test edilemezdi.
 */
export function StatusBadge({
  view,
  siteId,
  onRetry,
}: {
  view: SiteStatusView
  siteId?: string
  onRetry?: (formData: FormData) => Promise<void>
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
        <span className={`size-1.5 rounded-full ${DOT_TONE[view.status]}`} aria-hidden="true" />
        {LABELS[view.status]}
      </span>

      {view.action === 'reconnect' ? (
        <Link
          href="/baglan"
          className="rounded-md bg-cobalt-soft px-2 py-1 text-xs font-medium text-cobalt hover:underline"
        >
          {copy.status.reconnectAction}
        </Link>
      ) : null}

      {view.action === 'retry' && siteId && onRetry ? (
        <form action={onRetry}>
          <input type="hidden" name="siteId" value={siteId} />
          <button
            type="submit"
            className="rounded-md bg-cobalt-soft px-2 py-1 text-xs font-medium text-cobalt hover:underline"
          >
            {copy.status.retryAction}
          </button>
        </form>
      ) : null}
    </div>
  )
}
