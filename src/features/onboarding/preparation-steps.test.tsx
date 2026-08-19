import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PreparationSteps } from './preparation-steps'

const stepState = (label: string) => screen.getByText(label).closest('li')?.dataset.done

describe('PreparationSteps', () => {
  it('tamamlanan adımları işaretler', () => {
    render(<PreparationSteps stage="fetching_history" />)

    expect(stepState('Google bağlantısı kontrol edildi')).toBe('true')
    expect(stepState('Web sitesi bulundu')).toBe('true')
    expect(stepState('Dashboard hazır')).toBe('false')
  })

  it('ilk aşamada sonraki adımları tamamlanmış göstermez', () => {
    render(<PreparationSteps stage="connecting" />)

    expect(stepState('Web sitesi bulundu')).toBe('false')
    expect(stepState('Geçmiş performans verileri alındı')).toBe('false')
  })

  it('bittiğinde tüm adımlar tamamlanır', () => {
    render(<PreparationSteps stage="ready" />)

    expect(stepState('Dashboard hazır')).toBe('true')
  })

  it('dört adımı da her zaman gösterir', () => {
    // Kullanici kac adim kaldigini bastan gormeli; adimlar teker teker
    // belirirse ne kadar surecegini kestiremez.
    render(<PreparationSteps stage="connecting" />)
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })

  it('teknik terim göstermez', () => {
    const { container } = render(<PreparationSteps stage="fetching_history" />)
    expect(container.textContent).not.toMatch(/sync|worker|api|token|property|job/i)
  })
})
