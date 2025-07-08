import { renderHook, waitFor } from '@testing-library/react'
import { usePreloadData, useLanguageCache } from '../use-preload-data'
import { useTranslation } from 'react-i18next'
import { contentService } from '@/services/content-service'

// Mock dependencies
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn()
}))

jest.mock('@/services/content-service', () => ({
  contentService: {
    preloadEssentialData: jest.fn(),
    clearLanguageCache: jest.fn()
  }
}))

const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

describe('usePreloadData', () => {
  const mockI18n = {
    language: 'en',
    changeLanguage: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useTranslation as jest.Mock).mockReturnValue({ i18n: mockI18n })
  })

  afterEach(() => {
    consoleErrorSpy.mockClear()
  })

  it('should start with loading state', () => {
    const { result } = renderHook(() => usePreloadData())
    
    expect(result.current.isPreloading).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('should preload data successfully', async () => {
    ;(contentService.preloadEssentialData as jest.Mock).mockResolvedValue(undefined)

    const { result } = renderHook(() => usePreloadData())

    await waitFor(() => {
      expect(result.current.isPreloading).toBe(false)
    })

    expect(contentService.preloadEssentialData).toHaveBeenCalledWith('en')
    expect(result.current.error).toBeNull()
  })

  it('should handle preload errors', async () => {
    const mockError = new Error('Preload failed')
    ;(contentService.preloadEssentialData as jest.Mock).mockRejectedValue(mockError)

    const { result } = renderHook(() => usePreloadData())

    await waitFor(() => {
      expect(result.current.isPreloading).toBe(false)
    })

    expect(result.current.error).toBe(mockError)
    expect(consoleErrorSpy).toHaveBeenCalledWith('Preload failed:', mockError)
  })

  it('should reload when language changes', async () => {
    ;(contentService.preloadEssentialData as jest.Mock).mockResolvedValue(undefined)

    const { result, rerender } = renderHook(() => usePreloadData())

    await waitFor(() => {
      expect(result.current.isPreloading).toBe(false)
    })

    expect(contentService.preloadEssentialData).toHaveBeenCalledTimes(1)
    expect(contentService.preloadEssentialData).toHaveBeenCalledWith('en')

    // Change language
    mockI18n.language = 'zhTW'
    ;(useTranslation as jest.Mock).mockReturnValue({ i18n: { ...mockI18n, language: 'zhTW' } })

    rerender()

    await waitFor(() => {
      expect(contentService.preloadEssentialData).toHaveBeenCalledTimes(2)
    })

    expect(contentService.preloadEssentialData).toHaveBeenLastCalledWith('zhTW')
  })

  it('should reset error on successful reload', async () => {
    const mockError = new Error('Initial error')
    ;(contentService.preloadEssentialData as jest.Mock)
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce(undefined)

    const { result, rerender } = renderHook(() => usePreloadData())

    await waitFor(() => {
      expect(result.current.error).toBe(mockError)
    })

    // Trigger reload by changing language
    mockI18n.language = 'es'
    ;(useTranslation as jest.Mock).mockReturnValue({ i18n: { ...mockI18n, language: 'es' } })

    rerender()

    await waitFor(() => {
      expect(result.current.isPreloading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })
})

describe('useLanguageCache', () => {
  const mockI18n = {
    language: 'en',
    changeLanguage: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useTranslation as jest.Mock).mockReturnValue({ i18n: mockI18n })
    ;(contentService.clearLanguageCache as jest.Mock).mockResolvedValue(undefined)
  })

  afterEach(() => {
    consoleErrorSpy.mockClear()
  })

  it('should not clear cache on initial render', () => {
    renderHook(() => useLanguageCache())

    expect(contentService.clearLanguageCache).not.toHaveBeenCalled()
  })

  it('should clear previous language cache when language changes', async () => {
    const { rerender } = renderHook(() => useLanguageCache())

    // Change language
    mockI18n.language = 'zhTW'
    ;(useTranslation as jest.Mock).mockReturnValue({ i18n: { ...mockI18n, language: 'zhTW' } })

    rerender()

    await waitFor(() => {
      expect(contentService.clearLanguageCache).toHaveBeenCalledWith('en')
    })
  })

  it('should handle cache clear errors', async () => {
    const mockError = new Error('Cache clear failed')
    ;(contentService.clearLanguageCache as jest.Mock).mockRejectedValue(mockError)

    const { rerender } = renderHook(() => useLanguageCache())

    // Change language
    mockI18n.language = 'es'
    ;(useTranslation as jest.Mock).mockReturnValue({ i18n: { ...mockI18n, language: 'es' } })

    rerender()

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(mockError)
    })
  })

  it('should track multiple language changes', async () => {
    // Start with 'en'
    mockI18n.language = 'en'
    ;(useTranslation as jest.Mock).mockReturnValue({ i18n: { ...mockI18n, language: 'en' } })
    
    const { rerender } = renderHook(() => useLanguageCache())

    // First change: en -> zhTW
    mockI18n.language = 'zhTW'
    ;(useTranslation as jest.Mock).mockReturnValue({ i18n: { ...mockI18n, language: 'zhTW' } })
    rerender()

    await waitFor(() => {
      expect(contentService.clearLanguageCache).toHaveBeenCalledWith('en')
    })

    // Second change: zhTW -> es
    mockI18n.language = 'es'
    ;(useTranslation as jest.Mock).mockReturnValue({ i18n: { ...mockI18n, language: 'es' } })
    rerender()

    await waitFor(() => {
      expect(contentService.clearLanguageCache).toHaveBeenCalledWith('zhTW')
    })

    expect(contentService.clearLanguageCache).toHaveBeenCalledTimes(2)
  })

  it('should not clear cache if language does not change', () => {
    const { rerender } = renderHook(() => useLanguageCache())

    // Rerender without changing language
    rerender()
    rerender()
    rerender()

    expect(contentService.clearLanguageCache).not.toHaveBeenCalled()
  })

  it('should handle rapid language changes', async () => {
    // Start with 'en'
    mockI18n.language = 'en'
    ;(useTranslation as jest.Mock).mockReturnValue({ i18n: { ...mockI18n, language: 'en' } })
    
    const { rerender } = renderHook(() => useLanguageCache())

    // Rapid language changes
    const languages = ['zhTW', 'es', 'ja', 'ko', 'fr']
    let previousLang = 'en'
    
    for (const lang of languages) {
      mockI18n.language = lang
      ;(useTranslation as jest.Mock).mockReturnValue({ i18n: { ...mockI18n, language: lang } })
      rerender()
      
      await waitFor(() => {
        expect(contentService.clearLanguageCache).toHaveBeenCalledWith(previousLang)
      })
      
      previousLang = lang
    }

    expect(contentService.clearLanguageCache).toHaveBeenCalledTimes(languages.length)

    // Should have cleared caches for previous languages
    expect(contentService.clearLanguageCache).toHaveBeenCalledWith('en')
    expect(contentService.clearLanguageCache).toHaveBeenCalledWith('zhTW')
    expect(contentService.clearLanguageCache).toHaveBeenCalledWith('es')
    expect(contentService.clearLanguageCache).toHaveBeenCalledWith('ja')
    expect(contentService.clearLanguageCache).toHaveBeenCalledWith('ko')
  })
})