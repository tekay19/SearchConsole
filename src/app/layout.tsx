import type { Metadata } from 'next'
import { Bricolage_Grotesque, Public_Sans } from 'next/font/google'
import { copy } from '@/lib/copy'
import './globals.css'

/**
 * İki yazı tipi, iki iş.
 *
 * Bricolage Grotesque yalnızca başlıklarda ve büyük sayılarda: sıkı, hafif
 * daralmış, karakterli bir grotesk. Panelin kimliğini o taşıyor.
 *
 * Public Sans geri kalan her şeyde: okunurluğu tartışmasız, tablo rakamları
 * hizalı. latin-ext alt kümesi Türkçe harfler (ğ, ş, ı, İ) için zorunlu.
 */
const display = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
})

const sans = Public_Sans({
  variable: '--font-public-sans',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: copy.app.name,
  description: copy.app.tagline,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
