import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PreparationProgress } from '@/server/services/onboarding.service'
import { PreparationWatcher } from './preparation-watcher'

const site = (stage: PreparationProgress['stage']): PreparationProgress => ({
  siteId: 's1',
  displayName: 'example.com',
  stage,
})

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
afterEach(() => vi.useRealTimers())

describe('PreparationWatcher', () => {
  it('hazır değilken dashboard bağlantısı göstermez', () => {
    render(<PreparationWatcher initial={[site('fetching_history')]} poll={vi.fn()} />)

    expect(screen.queryByRole('link', { name: "Dashboard'a Git" })).not.toBeInTheDocument()
    expect(screen.getByText(/arka planda devam eder/)).toBeInTheDocument()
  })

  it('hazır olduğunda dashboard bağlantısı gösterir', () => {
    render(<PreparationWatcher initial={[site('ready')]} poll={vi.fn()} />)

    expect(screen.getByRole('link', { name: "Dashboard'a Git" })).toBeInTheDocument()
  })

  it('hazır olduğunda yoklamayı durdurur', () => {
    // Bitmis bir isi sonsuza kadar sormak bosuna yuk.
    const poll = vi.fn()
    render(<PreparationWatcher initial={[site('ready')]} poll={poll} />)

    vi.advanceTimersByTime(10_000)

    expect(poll).not.toHaveBeenCalled()
  })

  it('hazır değilken yoklamayı sürdürür', async () => {
    const poll = vi.fn().mockResolvedValue([site('fetching_history')])
    render(<PreparationWatcher initial={[site('fetching_history')]} poll={poll} />)

    vi.advanceTimersByTime(5_000)

    await waitFor(() => expect(poll).toHaveBeenCalled())
  })

  it('yoklama hazır dönünce ekranı günceller', async () => {
    const poll = vi.fn().mockResolvedValue([site('ready')])
    render(<PreparationWatcher initial={[site('fetching_history')]} poll={poll} />)

    vi.advanceTimersByTime(2_500)

    await waitFor(() =>
      expect(screen.getByRole('link', { name: "Dashboard'a Git" })).toBeInTheDocument(),
    )
  })
})
