import { ConnectButton } from '@/features/onboarding/connect-button'
import { RankLadder } from '@/features/onboarding/rank-ladder'
import { copy } from '@/lib/copy'

/**
 * Sistemi ilk kez açan kişinin gördüğü tek ekran.
 * Tek bir iş yapar: Google hesabını bağlatmak. Başka seçenek sunmaz.
 */
export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { error } = await searchParams

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl items-center px-6 py-16">
      <div className="grid w-full items-center gap-14 md:grid-cols-[1fr_auto] md:gap-20">
        <div className="max-w-md">
          <p className="font-display text-sm font-semibold tracking-widest text-ink-faint uppercase">
            {copy.app.name}
          </p>

          <h1 className="mt-5 font-display text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
            {copy.onboarding.headline}
          </h1>

          <p className="mt-5 text-base leading-relaxed text-ink-muted">{copy.onboarding.subhead}</p>

          {error ? (
            <p className="mt-7 rounded-(--radius) border-l-2 border-fall bg-paper-raised px-4 py-3 text-sm text-ink">
              {error === 'AccessDenied' ? copy.onboarding.accessDenied : copy.onboarding.connectFailed}
            </p>
          ) : null}

          <div className="mt-9">
            <ConnectButton />
          </div>

          <p className="mt-4 text-sm leading-relaxed text-ink-faint">{copy.onboarding.connectNote}</p>
        </div>

        <div className="w-full max-w-xs justify-self-center md:w-80">
          <RankLadder />
        </div>
      </div>
    </main>
  )
}
