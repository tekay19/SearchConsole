import { previousPeriod, type Period } from '@/lib/date/period'
import { compareMetric, type Trend } from '@/lib/metrics/trend'
import { dimensionsRepo, type DimensionKind, type DimensionRow } from '@/server/repositories/dimensions.repo'
import type { SiteScope } from '@/server/repositories/metrics-read.repo'

export const DEFAULT_TOP_LIMIT = 50

export type DimensionEntry = DimensionRow & { trend: Trend }

export const dimensionsService = {
  /**
   * En iyi N satır, her biri önceki dönemle karşılaştırmalı.
   *
   * Sıralama mevcut dönemin sırasıdır; karşılaştırma yalnızca satırın
   * yanındaki oku belirler. Önceki dönemde olmayan bir satır "sonsuz
   * artış" değil nötr sayılır — yeni çıkan bir kelimeyi yüzde binlik
   * büyüme diye göstermek yanıltıcı olur.
   */
  async getTop(
    kind: DimensionKind,
    scope: SiteScope,
    period: Period,
    limit: number = DEFAULT_TOP_LIMIT,
  ): Promise<DimensionEntry[]> {
    const current = await dimensionsRepo.topBy(kind, scope, period, limit)
    const previous = await dimensionsRepo.topBy(kind, scope, previousPeriod(period), limit)

    const previousByKey = new Map(previous.map((row) => [row.key, row]))

    return current.map((row) => ({
      ...row,
      trend: compareMetric(row.clicks, previousByKey.get(row.key)?.clicks ?? null, {}),
    }))
  },

  /** Ülke ve cihaz ekranlarının kullandığı yüzde paylı liste. */
  async getShare(kind: DimensionKind, scope: SiteScope, period: Period) {
    return dimensionsRepo.shareOf(kind, scope, period)
  },
}
