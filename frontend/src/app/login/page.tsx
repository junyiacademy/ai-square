'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { LoginForm } from '@/components/auth/LoginForm'

function LoginContent() {
  const { t } = useTranslation('auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState('')

  useEffect(() => {
    // 檢查是否因為 token 過期而被重定向
    if (searchParams.get('expired') === 'true') {
      setInfo(t('info.sessionExpired', 'Your session has expired. Please login again.'))
    }
  }, [searchParams, t])

  const handleLogin = async (credentials: { email: string; password: string; rememberMe: boolean }) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (data.success) {
        // 儲存用戶資訊到 localStorage
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('isLoggedIn', 'true')
        
        // 觸發自定義事件通知 Header 更新
        window.dispatchEvent(new CustomEvent('auth-changed'))
        
        // 根據用戶狀態導向不同頁面
        if (!data.user.hasCompletedOnboarding) {
          router.push('/onboarding/welcome')
        } else if (!data.user.hasCompletedAssessment) {
          router.push('/assessment')
        } else {
          router.push('/dashboard')
        }
      } else {
        // 顯示錯誤訊息
        setError(data.error || t('error.invalidCredentials'))
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(t('error.networkError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 標題區域 */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
            <svg 
              className="h-8 w-8 text-white" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {t('loginTitle')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('platformSubtitle')}
          </p>
        </div>

        {/* 登入表單區域 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {info && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
              {info}
            </div>
          )}
          <LoginForm 
            onSubmit={handleLogin}
            loading={loading}
            error={error}
          />
        </div>

        {/* 底部說明 */}
        <div className="text-center text-xs text-gray-500">
          {t('devNote')}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" />}>
      <LoginContent />
    </Suspense>
  )
}