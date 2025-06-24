'use client'

import { Header } from './Header'
import { ThemeProvider } from '@/contexts/ThemeContext'

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <ThemeProvider>
      <Header />
      <main className="min-h-screen bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary">
        {children}
      </main>
    </ThemeProvider>
  )
}