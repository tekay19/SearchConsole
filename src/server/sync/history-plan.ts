import { DATA_LAG_DAYS } from '@/lib/date/period'

/** Google performans verisini en fazla 16 ay geriye veriyor. */
export const HISTORY_MONTHS = 16

const DAY = 86_400_000
const iso = (milliseconds: number) => new Date(milliseconds).toISOString().slice(0, 10)

export type HistoryChunk = { from: string; to: string }

/**
 * Geçmişi aylık dilimlere böler, en yeniden en eskiye.
 *
 * Tek istekte alınamaz: 16 ay × binlerce arama terimi satır sınırını
 * kat kat aşar. Aylık dilim üç işe birden yarıyor — bir dilim hata
 * alırsa yalnızca o yeniden denenir, kullanıcı "hazırlanıyor" ekranında
 * ilerleme görebilir, ve en yeni ay önce geldiği için panel işe yarar
 * veriyle 16 ayın tamamını beklemeden açılır.
 */
export function planHistoryChunks(today: Date): HistoryChunk[] {
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - DATA_LAG_DAYS * DAY

  const chunks: HistoryChunk[] = []
  let cursor = end

  for (let index = 0; index < HISTORY_MONTHS; index += 1) {
    const cursorDate = new Date(cursor)
    const monthStart = Date.UTC(cursorDate.getUTCFullYear(), cursorDate.getUTCMonth(), 1)

    chunks.push({ from: iso(monthStart), to: iso(cursor) })
    cursor = monthStart - DAY
  }

  return chunks
}
