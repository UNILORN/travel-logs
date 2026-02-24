import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Noto_Serif_JP } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { TripProvider } from '@/lib/trip-context'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const _notoSerifJP = Noto_Serif_JP({ subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: 'たびログ - 旅のプランニング & アーカイブ',
  description: '旅行の計画から記録まで。あなただけの旅の本棚を作ろう。',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#c8956c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className="font-sans antialiased">
        <TripProvider>
          {children}
        </TripProvider>
        <Analytics />
      </body>
    </html>
  )
}
