import type { Metadata } from 'next'
import Link from 'next/link'

import './globals.css'

export const metadata: Metadata = {
  title: 'GeoRush – Fast Geography Challenges',
  description: 'GeoRush is built like a game show for geography. Jump in instantly, pick your mode, and chase cleaner runs every day.',
  openGraph: {
    title: 'GeoRush – Fast Geography Challenges',
    description: 'Fast rounds. Real ranks. Daily streaks. Turn map knowledge into reflex.',
    siteName: 'GeoRush',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#1f6feb" />
      </head>
      <body className="font-sans antialiased">
        <nav className="sticky top-0 z-40 border-b border-[#d4deea]/60 bg-white/80 backdrop-blur-md px-3 sm:px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <Link href="/" className="text-base sm:text-lg font-extrabold bg-gradient-to-r from-[#0f5bd8] via-[#17a06f] to-[#f18a3d] bg-clip-text text-transparent shrink-0">
              GeoRush
            </Link>
            <div className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-medium text-[#5a6b7a]">
              <Link href="/modes" className="px-2 sm:px-3 py-1.5 rounded-lg hover:bg-[#f0f4f8] transition-colors">
                Modes
              </Link>
              <Link href="/leaderboard" className="px-2 sm:px-3 py-1.5 rounded-lg hover:bg-[#f0f4f8] transition-colors whitespace-nowrap">
                Ranks
              </Link>
              <Link href="/profile" className="px-2 sm:px-3 py-1.5 rounded-lg hover:bg-[#f0f4f8] transition-colors">
                Profile
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
