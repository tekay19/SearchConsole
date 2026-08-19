import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PerformanceChart } from './performance-chart'

const points = [
  { date: '2026-08-01', clicks: 100, impressions: 4000 },
  { date: '2026-08-02', clicks: 120, impressions: 4300 },
  { date: '2026-08-03', clicks: 90, impressions: 3800 },
]

describe('PerformanceChart', () => {
  it('varsayılan olarak tıklamaları gösterir', () => {
    render(<PerformanceChart points={points} />)
    expect(screen.getByRole('tab', { name: 'Tıklamalar', selected: true })).toBeInTheDocument()
  })

  it('görüntülenmelere geçilebilir', async () => {
    render(<PerformanceChart points={points} />)

    await userEvent.click(screen.getByRole('tab', { name: "Google'da Görüntülenme" }))

    expect(screen.getByRole('tab', { name: "Google'da Görüntülenme", selected: true })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Tıklamalar', selected: false })).toBeInTheDocument()
  })

  it('veri yoksa açıklayıcı mesaj gösterir', () => {
    // Bos bir grafik cizmek kullaniciyi "bozuk mu" diye dusundurur.
    render(<PerformanceChart points={[]} />)
    expect(screen.getByText('Bu dönem için henüz veri yok.')).toBeInTheDocument()
  })

  it('veri yoksa sekmeleri de göstermez', () => {
    render(<PerformanceChart points={[]} />)
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('grafiğe erişilebilir bir başlık verir', () => {
    render(<PerformanceChart points={points} />)
    expect(screen.getByText('Google Performansı')).toBeInTheDocument()
  })
})
