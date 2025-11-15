import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { contentService } from '@/services/content-service'

/**
 * Hook 用於預載重要資料
 * 在應用程式初始化時使用
 */
export function usePreloadData() {
  const { i18n } = useTranslation()
  const [isPreloading, setIsPreloading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const preload = async () => {
      try {
        setIsPreloading(true)
        await contentService.preloadEssentialData(i18n.language)
      } catch (err) {
        setError(err as Error)
        console.error('Preload failed:', err)
      } finally {
        setIsPreloading(false)
      }
    }

    preload()
  }, [i18n.language])

  return { isPreloading, error }
}

/**
 * Hook 用於處理語言切換時的快取清理
 */
export function useLanguageCache() {
  const { i18n } = useTranslation()
  const [previousLang, setPreviousLang] = useState(i18n.language)

  useEffect(() => {
    if (previousLang !== i18n.language) {
      // 清除舊語言的快取
      contentService.clearLanguageCache(previousLang).catch(console.error)
      setPreviousLang(i18n.language)
    }
  }, [i18n.language, previousLang])
}
