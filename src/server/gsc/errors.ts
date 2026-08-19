/**
 * Google'dan gelen her aksilik bu dört koda indirgenir. Üst katmanlar HTTP
 * durum kodu görmez; ne yapacaklarına bu koda bakarak karar verirler.
 */
export type GscErrorCode = 'needs_reconnect' | 'rate_limited' | 'not_found' | 'unavailable'

export class GscError extends Error {
  constructor(
    readonly code: GscErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'GscError'
  }
}

/** Yeniden denemenin anlamlı olduğu kodlar. Diğerleri kullanıcı aksiyonu bekler. */
export const RETRYABLE: readonly GscErrorCode[] = ['rate_limited', 'unavailable']

const RATE_LIMIT_REASONS = new Set(['rateLimitExceeded', 'userRateLimitExceeded', 'quotaExceeded'])

/**
 * Bunlar kurulum hatalarıdır: API etkinleştirilmemiş ya da proje yanlış
 * yapılandırılmış. Kullanıcının bağlantısında bir sorun yok, yeniden
 * bağlanması hiçbir şeyi düzeltmez. Onu boş yere uğraştırmak yerine
 * geçici hata deyip geçiyoruz; gerçek çözüm sunucu günlüğünde görünür.
 */
const CONFIGURATION_REASONS = new Set(['accessNotConfigured', 'forbidden'])

/** Google'ın hata gövdesinden gerekçe etiketlerini toplar; biçim bozuksa boş döner. */
function reasonsOf(body: unknown): string[] {
  if (typeof body !== 'object' || body === null) return []

  const { error } = body as { error?: unknown }
  if (typeof error !== 'object' || error === null) return []

  const { status, errors } = error as { status?: unknown; errors?: unknown }

  const nested = Array.isArray(errors)
    ? errors.map((entry) =>
        typeof entry === 'object' && entry !== null ? String((entry as { reason?: unknown }).reason) : '',
      )
    : []

  return [typeof status === 'string' ? status : '', ...nested].filter(Boolean)
}

/**
 * 403 iki bambaşka şey anlatabilir: kullanım sınırı aşıldı (geçici, kendi
 * kendine düzelir) veya izin iptal edildi (kalıcı, kullanıcı bağlantıyı
 * yenilemeli). Bu yüzden önce gerekçe listesine bakılır; gerekçe yoksa
 * izin sorunu varsayılır — kullanıcıyı sonsuza kadar yeniden denemektense
 * bir kez rahatsız etmek daha iyidir.
 */
export function classifyGoogleError(status: number, body: unknown): GscErrorCode {
  const reasons = reasonsOf(body)

  if (reasons.some((reason) => RATE_LIMIT_REASONS.has(reason))) return 'rate_limited'
  if (reasons.some((reason) => CONFIGURATION_REASONS.has(reason))) return 'unavailable'
  if (status === 429) return 'rate_limited'
  if (status === 401 || status === 403) return 'needs_reconnect'
  if (status === 404) return 'not_found'
  return 'unavailable'
}
