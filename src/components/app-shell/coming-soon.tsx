import { copy } from '@/lib/copy'

/** Henüz yazılmamış bölümler için yer tutucu. Menüde kırık bağlantı bırakmamak adına. */
export function ComingSoon() {
  return (
    <p className="rounded-(--radius) border border-dashed border-rule px-5 py-8 text-center text-sm text-ink-muted">
      {copy.common.comingSoon}
    </p>
  )
}
