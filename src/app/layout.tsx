import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { OfflineBanner } from '@/components/ui/OfflineBanner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RapiQ — GoBD-konforme Kasse für kleine Händler',
  description:
    'Digitales Kassenbuch und TSE-konforme Kasse für Cafés, Bäckereien, Restaurants und mehr. Keine Hardware nötig.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://rapiq.net'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${inter.className} bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased`}>
        <OfflineBanner />
        {children}
      </body>
    </html>
  )
}
