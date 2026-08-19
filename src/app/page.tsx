import { redirect } from 'next/navigation'

/**
 * Kök adresin kendi içeriği yoktur.
 *
 * Oturumu olan kullanıcı Genel Bakış'a düşer; olmayanı `requireSession`
 * oradan giriş ekranına gönderir.
 */
export default function RootPage() {
  redirect('/genel-bakis')
}
