import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './status-badge'

const noop = async () => {}

describe('StatusBadge', () => {
  it('güncel durumu gösterir', () => {
    render(<StatusBadge view={{ status: 'fresh', action: null }} />)
    expect(screen.getByText('Güncel')).toBeInTheDocument()
  })

  it('veri alınırken bunu söyler', () => {
    render(<StatusBadge view={{ status: 'syncing', action: null }} />)
    expect(screen.getByText('Veri alınıyor')).toBeInTheDocument()
  })

  it('bağlantı gerektiğinde yenileme bağlantısı gösterir', () => {
    render(<StatusBadge view={{ status: 'needs_reconnect', action: 'reconnect' }} />)
    expect(screen.getByRole('link', { name: 'Bağlantıyı Yenile' })).toBeInTheDocument()
  })

  it('veri alınamadığında tekrar deneme düğmesi gösterir', () => {
    render(<StatusBadge view={{ status: 'failed', action: 'retry' }} siteId="s1" onRetry={noop} />)
    expect(screen.getByRole('button', { name: 'Tekrar Dene' })).toBeInTheDocument()
  })

  it('güncel durumda hiçbir aksiyon göstermez', () => {
    render(<StatusBadge view={{ status: 'fresh', action: null }} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('hata kodu veya teknik ayrıntı sızdırmaz', () => {
    const { container } = render(<StatusBadge view={{ status: 'failed', action: 'retry' }} siteId="s1" onRetry={noop} />)
    expect(container.textContent).not.toMatch(/error|token|api|403|500/i)
  })
})
