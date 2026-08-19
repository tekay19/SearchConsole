import NextAuth from 'next-auth'
import { redirect } from 'next/navigation'
import { connectionsRepo } from '@/server/repositories/connections.repo'
import { usersRepo } from '@/server/repositories/users.repo'
import { authConfig } from './config'
import { encryptSecret } from './crypto'

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

      if (!account.refresh_token) {
        // access_type=offline + prompt=consent varken buraya düşmemeli.
        // Düşerse arka plan toplama çalışmaz; sessizce devam etmek yerine duruyoruz.
        throw new Error('Google yenileme jetonu göndermedi; bağlantı kaydedilmedi.')
      }

      const user = await usersRepo.upsertByEmail({
        email: profile.email,
        name: typeof profile.name === 'string' ? profile.name : null,
      })

      const connection = await connectionsRepo.upsertFromGoogle({
        userId: user.id,
        googleSub: String(account.providerAccountId),
        googleEmail: profile.email,
        accessTokenEncrypted: encryptSecret(account.access_token ?? ''),
        refreshTokenEncrypted: encryptSecret(account.refresh_token),
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
