import NextAuth from 'next-auth'
import { redirect } from 'next/navigation'
import { connectionsRepo } from '@/server/repositories/connections.repo'
import { usersRepo } from '@/server/repositories/users.repo'
import { authConfig } from './config'
import { encryptSecret } from './crypto'
import { consumeAccountLink } from './link-intent'

declare module 'next-auth' {
  interface Session {
    userId: string
    connectionId: string
  }
}

/**
 * Genişletme hedefi bilerek '@auth/core/jwt'. 'next-auth/jwt' yalnızca bu
 * modülü yeniden dışa aktarır ve TypeScript salt yeniden-dışa-aktaran bir
 * modülü genişletemez ("Invalid module name in augmentation").
 */
declare module '@auth/core/jwt' {
  interface JWT {
    userId?: string
    connectionId?: string
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    /**
     * Google jetonları JWT'ye değil, şifreli olarak veritabanına yazılır.
     *
     * Sebep: veriyi toplayan işçi süreç bir tarayıcı oturumuna sahip değildir.
     * Jeton yalnızca çerezde yaşasaydı arka planda hiçbir şey toplanamazdı.
     * Bu yüzden çerezde sadece iki kimlik taşınır; jetonun kendisi ve
     * tazelenmesi veritabanı üzerinden yürür (bkz. server/gsc/access-token.ts).
     */
    async jwt({ token, account, profile }) {
      if (!account || !profile?.email) return token

      /**
       * İki farklı akış aynı yerden geçiyor:
       *
       * - Normal giriş: kullanıcı Google e-postasından bulunur veya açılır.
       * - Hesap ekleme: kullanıcı zaten var, yeni Google hesabı ona bağlanır.
       *
       * Ayrım olmasaydı ikinci bir Google hesabıyla giriş yapmak yeni bir
       * kullanıcı açardı ve kişinin siteleri iki ayrı panele bölünürdü.
       */
      const linkedUserId = await consumeAccountLink()

      const user = linkedUserId
        ? { id: linkedUserId }
        : await usersRepo.upsertByEmail({
            email: profile.email,
            name: typeof profile.name === 'string' ? profile.name : null,
          })

      /**
       * Google yenileme jetonunu yalnızca izin ekranından geçen akışta
       * gönderir. Normal girişte gelmemesi beklenen durumdur — kayıtlı
       * olan zaten duruyor ve arka plan onunla çalışıyor.
       *
       * Bu yüzden gelmediğinde hata vermiyoruz; kaydı ezmiyoruz.
       * Yalnızca hiç kaydı olmayan yepyeni bir bağlantı jetonsuz gelirse
       * duruyoruz: o bağlantı hiçbir zaman veri toplayamazdı.
       */
      const connection = await connectionsRepo.upsertFromGoogle({
        userId: user.id,
        googleSub: String(account.providerAccountId),
        googleEmail: profile.email,
        accessTokenEncrypted: encryptSecret(account.access_token ?? ''),
        refreshTokenEncrypted: account.refresh_token ? encryptSecret(account.refresh_token) : null,
        accessTokenExpiresAt: new Date((account.expires_at ?? 0) * 1000),
      })

      return { ...token, userId: user.id, connectionId: connection.id }
    },

    session({ session, token }) {
      session.userId = token.userId ?? ''
      session.connectionId = token.connectionId ?? ''
      return session
    },
  },
})

export type AppSession = { userId: string; connectionId: string }

/**
 * Korumalı her sayfa bunu çağırır. Oturum yoksa kullanıcı bağlanma ekranına
 * düşer; sayfaların tek tek null kontrolü yapması gerekmez.
 */
export async function requireSession(): Promise<AppSession> {
  const session = await auth()
  if (!session?.userId || !session.connectionId) {
    redirect('/baglan')
  }
  return { userId: session.userId, connectionId: session.connectionId }
}
