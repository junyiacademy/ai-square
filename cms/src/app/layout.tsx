import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'AI Square CMS',
  description: 'Modern LLM-powered content management system with AI assistance',
  keywords: ['CMS', 'AI', 'Content Management', 'LLM', 'Vertex AI'],
  authors: [{ name: 'AI Square Team' }],
}

export const viewport = {
  themeColor: '#6366f1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}
