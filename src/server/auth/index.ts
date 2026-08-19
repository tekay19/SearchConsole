import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { redirect } from 'next/navigation'
import { usersRepo } from '@/server/repositories/users.repo'
import { authConfig } from './config'
import { verifyPassword } from './password'

declare module 'next-auth' {
  interface Session {
    userId: string
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId?: string
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-posta', type: 'email' },
        password: { label: 'Parola', type: 'password' },
      },

      /**
       * Parola doğrulama.
       *
       * Kullanıcı bulunamadığında da parola karşılaştırması yapılır gibi
       * davranmıyoruz ama dönen hata her iki durumda da aynı: hangi
       * e-postaların kayıtlı olduğunu sızdırmamak için.
       */
      async authorize(credentials) {
        const email = typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : ''
        const password = typeof credentials?.password === 'string' ? credentials.password : ''

        if (!email || !password) return null

        const user = await usersRepo.findByEmail(email)
        if (!user?.passwordHash) return null

        const valid = await verifyPassword(password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      // `user` yalnızca girişin ilk turunda dolu gelir.
      if (user?.id) token.userId = user.id
      return token
    },

    session({ session, token }) {
      session.userId = token.userId ?? ''
      return session
    },
  },
})

export type AppSession = { userId: string }

/**
 * Korumalı her sayfa bunu çağırır.
 *
 * Google bağlantısı aranmıyor: yeni kaydolmuş bir kullanıcının henüz
 * hesabı olmayabilir ve onu giriş ekranına geri atmak yerine panele
 * alıp bağlanmaya davet ediyoruz.
 */
export async function requireSession(): Promise<AppSession> {
  const session = await auth()
  if (!session?.userId) redirect('/giris')

  return { userId: session.userId }
}
