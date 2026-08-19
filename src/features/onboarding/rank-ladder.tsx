import { copy } from '@/lib/copy'

/**
 * Bu ürünün ölçtüğü tek şey: Google sonuç listesinde kaçıncı sıradasınız
 * ve o sıra hangi yöne gidiyor.
 *
 * Ekranda bunu anlatmanın en kısa yolu, o listenin kendisini göstermek.
 * Sizin siteniz 6. sıradan 2. sıraya çıkıyor; diğer sonuçlar bir basamak
 * aşağı kayıyor. Tek cümle açıklama gerekmiyor, hareket kendisi anlatıyor.
 *
 * Diğer sonuçlar bilerek soyut çubuk; uydurma marka adı yazmıyoruz.
 */

const ROW_HEIGHT = 46

/** from: başlangıç sırası (0 tabanlı), to: bitiş sırası. */
const ROWS = [
  { from: 0, to: 0, mine: false, width: '72%' },
  { from: 1, to: 2, mine: false, width: '58%' },
  { from: 2, to: 3, mine: false, width: '66%' },
  { from: 3, to: 4, mine: false, width: '49%' },
  { from: 4, to: 5, mine: false, width: '63%' },
  { from: 5, to: 1, mine: true, width: '78%' },
]

export function RankLadder() {
  return (
    <figure className="w-full">
      <div
        className="relative"
        style={{ height: ROWS.length * ROW_HEIGHT }}
        aria-hidden="true"
      >
        {ROWS.map((row, index) => (
          <div
            key={index}
            className="rank-row absolute inset-x-0 flex items-center gap-3"
            style={
              {
                height: ROW_HEIGHT,
                '--from': `${row.from * ROW_HEIGHT}px`,
                '--to': `${row.to * ROW_HEIGHT}px`,
              } as React.CSSProperties
            }
          >
            <span
              className={`w-5 shrink-0 text-right font-display text-sm tabular-nums ${
                row.mine ? 'text-cobalt' : 'text-ink-faint'
              }`}
            >
              {row.to + 1}
            </span>

            <div
              className={`flex h-9 flex-1 flex-col justify-center gap-1.5 rounded-lg px-3 ${
                row.mine ? 'bg-cobalt-soft ring-1 ring-cobalt/25' : 'bg-paper-raised ring-1 ring-rule'
              }`}
            >
              <span
                className={`block h-2 rounded-full ${row.mine ? 'bg-cobalt/70' : 'bg-rule'}`}
                style={{ width: row.width }}
              />
              <span
                className={`block h-1.5 rounded-full ${row.mine ? 'bg-cobalt/30' : 'bg-rule/60'}`}
                style={{ width: `calc(${row.width} * 0.55)` }}
              />
            </div>
          </div>
        ))}
      </div>

      <figcaption className="mt-5 flex items-baseline justify-center gap-2 text-sm">
        <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-cobalt" />
        <span className="text-ink-muted">{copy.onboarding.ladderCaption}</span>
      </figcaption>
    </figure>
  )
}
