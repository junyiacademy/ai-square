'use client'

import { useEffect, useState } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // 確保 i18n 在客戶端正確初始化
    const initI18n = async () => {
      // 從 localStorage 讀取保存的語言
      const savedLang = localStorage.getItem('ai-square-language')
      
      if (savedLang && savedLang !== i18n.language) {
        await i18n.changeLanguage(savedLang)
      }
      
      setIsInitialized(true)
    }

    initI18n()
  }, [])

  // 在初始化完成前，渲染一個佔位符避免 hydration mismatch
  if (!isInitialized) {
    return <div style={{ opacity: 0 }}>{children}</div>
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}