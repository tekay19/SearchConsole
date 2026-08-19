import Link from 'next/link'
import { redirect } from 'next/navigation'
import { signInAction } from '@/features/auth/actions'
import { AuthForm } from '@/features/auth/auth-form'
import { RankLadder } from '@/features/onboarding/rank-ladder'
import { copy } from '@/lib/copy'
import { auth } from '@/server/auth'

export default async function SignInPage() {
  const session = await auth()
  if (session?.userId) redirect('/genel-bakis')

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl items-center px-6 py-16">
      <div className="grid w-full items-center gap-14 md:grid-cols-[1fr_auto] md:gap-20">
        <div className="w-full max-w-sm">
          <p className="font-display text-sm font-semibold tracking-widest text-ink-faint uppercase">
            {copy.app.name}
          </p>

          <h1 className="mt-4 mb-8 font-display text-3xl font-semibold tracking-tight text-balance">
            {copy.auth.signInTitle}
          </h1>

          <AuthForm mode="signIn" action={signInAction} />

          <p className="mt-6 text-sm text-ink-muted">
            {copy.auth.noAccount}
            <Link href="/kayit" className="ml-1.5 font-medium text-cobalt underline-offset-4 hover:underline">
              {copy.auth.goSignUp}
            </Link>
          </p>
        </div>

        <div className="hidden w-80 md:block">
          <RankLadder />
        </div>
      </div>
    </main>
  )
}
