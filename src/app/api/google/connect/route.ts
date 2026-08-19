import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/server/auth'
import { STATE_COOKIE, STATE_TTL_SECONDS, authorizationUrl, newState } from '@/server/gsc/oauth'

/**
 * Google hesabı bağlamayı başlatır.
 *
 * Oturum zorunlu: bu bir giriş yolu değil, giriş yapmış kullanıcının
 * veri kaynağı eklemesi. Bu ayrım sayesinde kaç Google hesabı bağlanırsa
 * bağlansın kullanıcının kimliği ve oturumu değişmiyor.
 */
export async function GET(request: Request): Promise<Response> {
  const session = await auth()
  if (!session?.userId) return NextResponse.redirect(new URL('/giris', request.url))

  const state = newState()
  const origin = new URL(request.url).origin

  // CSRF koruması: Google'ın geri getirdiği `state`, bizim yazdığımız
  // çerezle eşleşmezse dönüş isteği bizim başlattığımız akış değildir.
  const store = await cookies()
  store.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: STATE_TTL_SECONDS,
    path: '/',
  })

  return NextResponse.redirect(authorizationUrl(origin, state))
}
