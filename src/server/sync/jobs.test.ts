import { describe, expect, it } from 'vitest'
import { jobIdFor } from './jobs'

describe('jobIdFor', () => {
  it('aynı günlük iş için aynı kimliği üretir', () => {
    // Kuyruk aynı kimlikli isi ikinci kez eklemez; kullanici dugmeye
    // on kez bassa da tek is calisir.
    expect(jobIdFor({ kind: 'daily', siteId: 'site-1' })).toBe(jobIdFor({ kind: 'daily', siteId: 'site-1' }))
  })

  it('farklı siteleri ayırır', () => {
    expect(jobIdFor({ kind: 'daily', siteId: 'a' })).not.toBe(jobIdFor({ kind: 'daily', siteId: 'b' }))
  })

  it('geçmiş veri işini tarih aralığına göre ayırır', () => {
    const ocak = jobIdFor({ kind: 'history', siteId: 's', from: '2026-01-01', to: '2026-01-31' })
    const subat = jobIdFor({ kind: 'history', siteId: 's', from: '2026-02-01', to: '2026-02-28' })
    expect(ocak).not.toBe(subat)
  })

  it('günlük ve geçmiş işleri karıştırmaz', () => {
    const daily = jobIdFor({ kind: 'daily', siteId: 's' })
    const history = jobIdFor({ kind: 'history', siteId: 's', from: '2026-01-01', to: '2026-01-31' })
    expect(daily).not.toBe(history)
  })

  it('kuyruğun kabul ettiği karakterleri kullanır', () => {
    // BullMQ ozel is kimliginde iki nokta ustuste kabul etmiyor; kural
    // sessizce ihlal edilirse is hic kuyruga girmez.
    const ids = [
      jobIdFor({ kind: 'daily', siteId: 'a1b2-c3d4' }),
      jobIdFor({ kind: 'history', siteId: 'a1b2-c3d4', from: '2026-01-01', to: '2026-01-31' }),
    ]
    for (const id of ids) expect(id).not.toContain(':')
  })
})
