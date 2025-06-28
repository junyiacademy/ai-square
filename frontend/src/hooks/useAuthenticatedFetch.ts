/**
 * 使用認證的 fetch hook
 * 自動處理 token refresh
 */

import { useCallback } from 'react'
import { getTokenManager } from '@/lib/auth/token-manager'

export function useAuthenticatedFetch() {
  const authenticatedFetch = useCallback(async (url: string, options?: RequestInit) => {
    const tokenManager = getTokenManager()
    return tokenManager.authenticatedFetch(url, options)
  }, [])

  return authenticatedFetch
}