import { redirect } from 'next/navigation'

/**
 * Kök adresin kendi içeriği yoktur; kullanıcı her zaman Genel Bakış'a düşer.
 * Oturumu olmayan kullanıcıyı Genel Bakış /baglan adresine yönlendirir.
 */
export default function RootPage() {
  redirect('/genel-bakis')
}
