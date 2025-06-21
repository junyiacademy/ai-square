import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import '@/i18n'

interface Language {
  code: string
  name: string
}

const languages: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'es', name: 'Español' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ru', name: 'Русский' },
  { code: 'it', name: 'Italiano' },
]

export function LanguageSelector() {
  const { i18n } = useTranslation()
  const [currentLang, setCurrentLang] = useState(i18n.language)

  // 初始化時同步語言狀態
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('ai-square-language')
      if (savedLang && savedLang !== i18n.language) {
        i18n.changeLanguage(savedLang)
        setCurrentLang(savedLang)
      }
    }
  }, [i18n])

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng)
    setCurrentLang(lng)
    // 儲存用戶語言偏好
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-square-language', lng)
    }
    // 觸發自定義事件通知其他組件語言已改變
    window.dispatchEvent(new CustomEvent('language-changed', { detail: { language: lng } }))
  }

  return (
    <div className="relative">
      <select
        onChange={(e) => handleLanguageChange(e.target.value)}
        value={currentLang}
        className="bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none cursor-pointer hover:bg-gray-50 transition-colors"
        aria-label="選擇語言"
      >
        {languages.map((language) => (
          <option key={language.code} value={language.code}>
            {language.name}
          </option>
        ))}
      </select>
      {/* 自定義下拉箭頭 */}
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
        <svg 
          className="w-4 h-4 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 9l-7 7-7-7" 
          />
        </svg>
      </div>
    </div>
  )
} 