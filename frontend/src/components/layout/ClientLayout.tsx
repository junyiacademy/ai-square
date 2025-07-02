'use client'

import { usePathname } from 'next/navigation'
import { Header } from './Header'
import { Footer } from './Footer'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { I18nProvider } from '@/components/providers/I18nProvider'

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname()
  const isChat = pathname === '/chat'
  
  return (
    <I18nProvider>
      <ThemeProvider>
        <div className="flex flex-col min-h-screen">
          {!isChat && <Header />}
          <main className={`flex-1 bg-white dark:bg-slate-900 text-gray-900 dark:text-white ${isChat ? 'h-screen' : ''}`}>
            {children}
          </main>
          {!isChat && <Footer />}
        </div>
      </ThemeProvider>
    </I18nProvider>
  )
}