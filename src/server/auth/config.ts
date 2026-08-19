import Credentials from 'next-auth/providers/credentials'
import type { NextAuthConfig } from 'next-auth'

const DAY = 24 * 60 * 60

/**
 * Oturum bir ay yaşar ve her gün sessizce tazelenir.
 *
 * Süre belirtilmezse çerez oturumluk kalır ve tarayıcı kapanınca uçar;
 * kullanıcı her açılışta yeniden giriş yapmak zorunda kalır.
 */
const SESSION_MAX_AGE = 30 * DAY
const SESSION_UPDATE_AGE = DAY

/**
 * Kimlik e-posta ve parolayla kurulur; Google burada yok.
 *
 * Google hesapları kimlik değil veri kaynağıdır ve kendi akışıyla
 * bağlanır (src/server/gsc/oauth.ts). Ayrım kritik: Google kimlik
 * sağlayıcı olsaydı ikinci bir hesap bağlamak kimlik değiştirmek
 * anlamına gelir, kullanıcının oturumu düşer ve siteleri iki ayrı
 * panele bölünürdü.
 *
 * `authorize` gövdesi index.ts'te; şifre doğrulaması veritabanına
 * eriştiği için yapılandırmayı ağırlaştırmamak adına ayrıldı.
 */
export const credentialsProvider = Credentials({
  credentials: {
    email: { label: 'E-posta', type: 'email' },
    password: { label: 'Parola', type: 'password' },
  },
})

export const authConfig = {
  providers: [credentialsProvider],
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE,
    updateAge: SESSION_UPDATE_AGE,
  },
  pages: { signIn: '/giris', error: '/giris' },
} satisfies NextAuthConfig
