import Google from 'next-auth/providers/google'
import type { NextAuthConfig } from 'next-auth'
import { env } from '@/server/env'

/** Yalnızca okuma. Yazma kapsamı hiçbir zaman istenmez. */
export const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

const DAY = 24 * 60 * 60

/**
 * Oturum bir ay yaşar ve her gün sessizce tazelenir.
 *
 * Süre belirtilmezse çerez oturumluk kalır ve tarayıcı kapanınca uçar;
 * kullanıcı her açılışta yeniden giriş yapmak zorunda kalırdı.
 */
const SESSION_MAX_AGE = 30 * DAY
const SESSION_UPDATE_AGE = DAY

/**
 * `prompt` bilerek burada yok.
 *
 * Sabit `prompt: 'consent'` her girişte Google'ın izin ekranını açar.
 * İzin ekranı yalnızca yeni bir hesap bağlarken gerekli — yenileme
 * jetonu ancak orada geliyor. Normal girişte kullanıcıyı her seferinde
 * onay ekranından geçirmek anlamsız.
 *
 * Akış başına parametre `signIn()` çağrısında veriliyor
 * (bkz. server/auth/flows.ts).
 */
export const authConfig = {
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: `openid email profile ${SEARCH_CONSOLE_SCOPE}`,
          access_type: 'offline',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE,
    updateAge: SESSION_UPDATE_AGE,
  },
  pages: { signIn: '/baglan', error: '/baglan' },
} satisfies NextAuthConfig
