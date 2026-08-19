const LOCALE = 'tr-TR'

const count = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 })
const rate = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 2 })
const delta = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 1 })
const rank = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** Tam sayı: 128420 -> "128.420" */
export function formatCount(value: number): string {
  return count.format(value)
}

/** Dar alanlar (grafik ekseni, kart) için kısaltılmış sayı. */
export function formatCompactCount(value: number): string {
  if (Math.abs(value) < 1000) return count.format(value)
  return compact.format(value)
}

/** Oran: 0.0295 -> "%2,95". Türkçede yüzde işareti başa gelir. */
export function formatRate(ratio: number): string {
  return rate.format(ratio)
}

/** Ortalama sıra: 8.42 -> "8,4" */
export function formatRank(value: number): string {
  return rank.format(value)
}

/**
 * Değişim büyüklüğü: 0.124 -> "%12,4".
 * İşaret bilerek atılır — artı/eksi yönünü ok ve renk taşır, metin değil.
 */
export function formatDelta(ratio: number): string {
  return delta.format(Math.abs(ratio))
}
