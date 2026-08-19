export type SiteJob =
  | { kind: 'daily'; siteId: string }
  | { kind: 'history'; siteId: string; from: string; to: string }

/**
 * İşin kimliği içeriğinden türetilir.
 *
 * Kuyruk aynı kimlikli bir işi ikinci kez eklemez. Kullanıcı "Verileri
 * güncelle" düğmesine on kez bassa da, zamanlayıcı işçi yeniden başladığı
 * için aynı turu iki kez tetiklese de tek iş çalışır.
 */
/** Kuyruk özel iş kimliğinde iki nokta üstüste kabul etmiyor. */
const SEP = '__'

export function jobIdFor(job: SiteJob): string {
  return job.kind === 'daily'
    ? ['daily', job.siteId].join(SEP)
    : ['history', job.siteId, job.from, job.to].join(SEP)
}
