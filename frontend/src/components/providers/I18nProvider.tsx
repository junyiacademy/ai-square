'use client'

import { useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 確保 i18n 在客戶端正確初始化
    const initI18n = async () => {
      try {
        // 從 localStorage 讀取保存的語言
        const savedLang = localStorage.getItem('ai-square-language')

        if (savedLang && savedLang !== i18n.language) {
          await i18n.changeLanguage(savedLang)
        }
      } catch (error) {
        // Silently handle errors - fallback to default language
        console.warn('Failed to initialize i18n:', error)
      }
    }

    initI18n()
  }, [])

  // 總是渲染內容，即使 i18n 尚未初始化
  // 使用預設語言顯示內容，避免空白頁問題
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
