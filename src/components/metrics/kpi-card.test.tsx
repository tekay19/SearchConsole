import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Trend } from '@/lib/metrics/trend'
import { KpiCard } from './kpi-card'

const rising: Trend = {
  current: 128420,
  previous: 114000,
  absoluteChange: 14420,
  relativeChange: 0.124,
  sentiment: 'good',
}

const improvedRank: Trend = {
  current: 7.2,
  previous: 8.4,
  absoluteChange: -1.2,
  relativeChange: -0.142,
  sentiment: 'good',
}

const noComparison: Trend = {
  current: null,
  previous: null,
  absoluteChange: null,
  relativeChange: null,
  sentiment: 'neutral',
}

describe('KpiCard', () => {
  it('sayıyı Türkçe biçimde gösterir', () => {
    render(<KpiCard label="Tıklamalar" help="Açıklama" value={128420} valueKind="count" trend={rising} />)
    expect(screen.getByText('128.420')).toBeInTheDocument()
  })

  it('değişimi yüzde olarak gösterir', () => {
    render(<KpiCard label="Tıklamalar" help="Açıklama" value={128420} valueKind="count" trend={rising} />)
    expect(screen.getByText('%12,4')).toBeInTheDocument()
  })

  it('artışı yükseliş olarak anlatır', () => {
    render(<KpiCard label="Tıklamalar" help="Açıklama" value={128420} valueKind="count" trend={rising} />)
    expect(screen.getByLabelText('Geçen döneme göre arttı')).toBeInTheDocument()
  })

  it('sıralamada küçülmeyi iyileşme olarak anlatır', () => {
    // Ham isarete baksaydik "azaldi" derdik; kullanici icin bu iyilesmedir.
    render(
      <KpiCard
        label="Ortalama Google Sırası"
        help="Açıklama"
        value={7.2}
        valueKind="rank"
        trend={improvedRank}
        lowerIsBetter
      />,
    )
    expect(screen.getByText('7,2')).toBeInTheDocument()
    expect(screen.getByLabelText('Geçen döneme göre iyileşti')).toBeInTheDocument()
  })

  it('oranı yüzde olarak gösterir', () => {
    render(<KpiCard label="Tıklama Oranı" help="Açıklama" value={0.0295} valueKind="rate" trend={rising} />)
    expect(screen.getByText('%2,95')).toBeInTheDocument()
  })

  it('veri yoksa çizgi gösterir, sıfır göstermez', () => {
    // Sifir "hic tiklama olmadi" demek; veri yoklugu baska bir sey.
    render(<KpiCard label="Tıklama Oranı" help="Açıklama" value={null} valueKind="rate" trend={noComparison} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('karşılaştırma yapılamıyorsa bunu söyler', () => {
    render(<KpiCard label="Tıklamalar" help="Açıklama" value={50} valueKind="count" trend={noComparison} />)
    expect(screen.getByText('Karşılaştırma için yeterli geçmiş veri yok')).toBeInTheDocument()
  })

  it('açıklamayı erişilebilir biçimde sunar', () => {
    render(<KpiCard label="Tıklamalar" help="Google’dan gelen ziyaret sayısı." value={1} valueKind="count" trend={rising} />)
    expect(screen.getByText('Google’dan gelen ziyaret sayısı.')).toBeInTheDocument()
  })
})
