export type SiteStatus = 'fresh' | 'syncing' | 'needs_reconnect' | 'failed'
export type PreparationStage = 'connecting' | 'discovering' | 'fetching_history' | 'ready'

export type SiteStatusView = {
  status: SiteStatus
  /** Kullanıcının yapabileceği tek şey. Yapabileceği bir şey yoksa null. */
  action: 'reconnect' | 'retry' | null
}

/** Bu sayıya kadar olan hatalar kullanıcıya hiç yansımaz; kuyruk yeniden dener. */
export const MAX_FAILURES_BEFORE_FAILED = 3

/** Günlük toplama çalışıyorsa veri bundan eski olamaz. */
export const STALE_AFTER_DAYS = 2

const DAY_MS = 86_400_000

export type SiteSyncSnapshot = {
  stage: PreparationStage
  lastErrorCode: string | null
  consecutiveFailures: number
  lastSuccessAt: Date | null
}

/**
 * İç durumu kullanıcının göreceği dört durumdan birine indirger.
 *
 * Sıra bilinçli:
 *
 * 1. Yetki sorunu her şeyin önünde — kullanıcı bir şey yapmadan ilerleyemeyiz,
 *    "veri alınıyor" demek onu boşuna bekletmek olur.
 * 2. Hazırlık sürüyorsa henüz başarısızlık aramanın anlamı yok.
 * 3. Geçici hatalar eşiği aşana kadar gizlenir; kuyruk zaten yeniden deniyor
 *    ve her tökezlemede kullanıcıyı rahatsız etmek onu duyarsızlaştırır.
 * 4. Veri bayatladıysa hata sayacı sıfır olsa bile "Güncel" demeyiz. İşçi
 *    süreç hiç çalışmamış olabilir; rozetin yalan söylememesi bundan önemli.
 */
export function deriveSiteStatus(state: SiteSyncSnapshot, now: Date): SiteStatusView {
  if (state.lastErrorCode === 'needs_reconnect') {
    return { status: 'needs_reconnect', action: 'reconnect' }
  }

  if (state.stage !== 'ready') {
    return { status: 'syncing', action: null }
  }

  if (state.consecutiveFailures >= MAX_FAILURES_BEFORE_FAILED || state.lastSuccessAt === null) {
    return { status: 'failed', action: 'retry' }
  }

  const ageMs = now.getTime() - state.lastSuccessAt.getTime()
  if (ageMs > STALE_AFTER_DAYS * DAY_MS) {
    return { status: 'failed', action: 'retry' }
  }

  return { status: 'fresh', action: null }
}
