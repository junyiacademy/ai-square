'use client'

import { Header } from './Header'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { I18nProvider } from '@/components/providers/I18nProvider'

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <I18nProvider>
      <ThemeProvider>
        <Header />
        <main className="min-h-screen bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary">
          {children}
        </main>
      </ThemeProvider>
    </I18nProvider>
  )
}