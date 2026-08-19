const LOCALE = 'tr-TR'

/**
 * Kullanıcı "bugün" derken kendi takvimini kastediyor, sunucununkini değil.
 * Tek kullanıcı kitlesi Türkiye olduğu için saat dilimi sabit; çok bölgeli
 * hale gelirse burası kullanıcı tercihinden okunur.
 */
const TIME_ZONE = 'Europe/Istanbul'

const clock = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE })
const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', timeZone: TIME_ZONE })
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE })

/**
 * Takvim günü farkı — saat farkı değil. 23 saat önce olan bir an,
 * gece yarısını geçtiyse "dün"dür.
 */
function calendarDaysBetween(earlier: Date, later: Date): number {
  const toUtcMidnight = (date: Date) => Date.parse(`${dayKey.format(date)}T00:00:00Z`)
  return Math.round((toUtcMidnight(later) - toUtcMidnight(earlier)) / 86_400_000)
}

const isoDay = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', timeZone: 'UTC' })
const isoDayYear = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * Dönem aralığı: "20 Temmuz — 16 Ağustos 2026".
 *
 * Yıl yalnızca sonda; iki tarih aynı yıldaysa başta tekrar etmesi
 * gereksiz gürültü. Tarihler gün bazlı olduğu için UTC'de biçimlenir —
 * yerel saate çevirmek günü kaydırırdı.
 */
export function formatPeriodRange(from: string, to: string): string {
  const start = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)

  const sameYear = start.getUTCFullYear() === end.getUTCFullYear()

  return `${sameYear ? isoDay.format(start) : isoDayYear.format(start)} — ${isoDayYear.format(end)}`
}

export function formatLastUpdate(at: Date, now: Date): string {
  const days = calendarDaysBetween(at, now)
  if (days === 0) return `Bugün ${clock.format(at)}`
  if (days === 1) return `Dün ${clock.format(at)}`
  return `${dayMonth.format(at)} ${clock.format(at)}`
}
