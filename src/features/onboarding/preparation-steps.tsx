import { copy } from '@/lib/copy'
import type { PreparationStage } from '@/server/services/site-status'

/** Sıra önemli: bir adım, kendisinden önceki her adım bittiğinde tamamlanır. */
const STEPS: ReadonlyArray<{ stage: PreparationStage; label: string }> = [
  { stage: 'connecting', label: copy.onboarding.steps.connecting },
  { stage: 'discovering', label: copy.onboarding.steps.discovering },
  { stage: 'fetching_history', label: copy.onboarding.steps.fetchingHistory },
  { stage: 'ready', label: copy.onboarding.steps.ready },
]

/**
 * Hazırlık ilerlemesi.
 *
 * Dört adım da baştan görünür; teker teker belirse kullanıcı ne kadar
 * süreceğini kestiremezdi. Ham günlük gösterilmez — hangi isteğin
 * atıldığı kullanıcının sorunu değil.
 */
export function PreparationSteps({ stage }: { stage: PreparationStage }) {
  const currentIndex = STEPS.findIndex((step) => step.stage === stage)

  return (
    <ol className="space-y-3">
      {STEPS.map((step, index) => {
        const done = index < currentIndex || stage === 'ready'
        const active = index === currentIndex && stage !== 'ready'

        return (
          <li key={step.stage} data-done={String(done)} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                done
                  ? 'bg-rise text-white'
                  : active
                    ? 'bg-cobalt-soft text-cobalt'
                    : 'bg-rule text-ink-faint'
              }`}
            >
              {done ? '✓' : ''}
            </span>

            <span className={`text-sm ${done ? 'text-ink' : active ? 'text-ink' : 'text-ink-faint'}`}>
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
