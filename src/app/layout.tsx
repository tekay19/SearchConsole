import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { copy } from '@/lib/copy'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// Sekme başlığı da kullanıcıya görünen metindir; sözlükten gelir.
export const metadata: Metadata = {
  title: copy.app.name,
  description: copy.app.tagline,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
