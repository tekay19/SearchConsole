import Google from 'next-auth/providers/google'
import type { NextAuthConfig } from 'next-auth'
import { env } from '@/server/env'

/** Yalnızca okuma. Yazma kapsamı hiçbir zaman istenmez. */
export const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

export const authConfig = {
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: `openid email profile ${SEARCH_CONSOLE_SCOPE}`,
          /**
           * Bu ikisi birlikte olmadan Google yenileme jetonunu yalnızca ilk
           * onayda gönderir. Kullanıcı ikinci kez bağlandığında jeton gelmez,
           * arka planda veri toplama sessizce durur ve kimse fark etmez.
           */
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/baglan', error: '/baglan' },
} satisfies NextAuthConfig
