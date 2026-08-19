import { redirect } from 'next/navigation'

/**
 * Kök adresin kendi içeriği yoktur.
 *
 * Genel Bakış ekranı gelene kadar (Task 21) doğrudan bağlanma ekranına
 * yönlendiriyoruz; o zaman burası /genel-bakis'e dönecek ve oturumsuz
 * kullanıcıyı requireSession /baglan'a düşürecek.
 */
export default function RootPage() {
  redirect('/baglan')
}
