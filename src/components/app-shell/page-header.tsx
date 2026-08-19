import { Suspense } from 'react'
import { RangePicker } from '@/components/filters/range-picker'

/**
 * Her sayfanın üst bandı: başlık solda, tarih seçici sağda.
 * Tarih seçici isteğe bağlı — Ayarlar gibi ekranlarda anlamı yok.
 */
export function PageHeader({ title, withRange = true }: { title: string; withRange?: boolean }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-balance">{title}</h1>

      {withRange ? (
        <Suspense>
          <RangePicker />
        </Suspense>
      ) : null}
    </div>
  )
}
