'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { LoginForm } from '@/components/auth/LoginForm'
import { useAuth } from '@/contexts/AuthContext'

function LoginContent() {
  const { t } = useTranslation('auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
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
    console.log('handleLogin called with:', credentials)
    setLoading(true)
    setError('')

    try {
      // Use AuthContext login method which handles all state updates
      console.log('Calling login method...')
      const result = await login(credentials)
      console.log('Login result:', result)

      if (result.success) {
        console.log('Login successful, preparing to navigate...')
        
        // Check if there's a redirect URL
        const redirectUrl = searchParams.get('redirect')
        console.log('Redirect URL:', redirectUrl)
        
        if (redirectUrl) {
          // Validate redirect URL to prevent open redirect vulnerabilities
          const isValidRedirect = redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')
          if (isValidRedirect) {
            console.log('Redirecting to:', redirectUrl)
            router.push(redirectUrl)
            return
          }
        }
        
        // Default navigation based on onboarding status
        const userData = result.user as unknown as {
          onboarding?: Record<string, boolean>
          onboardingCompleted?: boolean
          assessmentCompleted?: boolean
        }
        const onboarding = userData?.onboarding || {}
        const derivedOnboardingCompleted = Boolean(
          onboarding.welcomeCompleted &&
            onboarding.identityCompleted &&
            onboarding.goalsCompleted
        )
        const isOnboardingCompleted = Boolean(
          userData?.onboardingCompleted || derivedOnboardingCompleted
        )
        const hasAssessment = Boolean(userData?.assessmentCompleted)
        console.log('User status:', { onboarding, isOnboardingCompleted, hasAssessment })
        
        // Navigate to dashboard directly - onboarding is optional
        // Users can choose to do onboarding from dashboard if they want
        console.log('Login successful, navigating to: /dashboard')
        router.push('/dashboard')
      } else {
        // 顯示錯誤訊息
        console.log('Login failed:', result.error)
        setError(result.error || t('error.invalidCredentials'))
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(t('error.networkError'))
    } finally {
      console.log('Login process complete, loading:', false)
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

        {/* 註冊連結 - 移到最上方 */}
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-700">
            {t('dontHaveAccount', "Don't have an account?")}{' '}
            <a 
              href={searchParams.get('redirect') ? `/register?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : '/register'} 
              className="font-semibold text-blue-600 hover:text-blue-700 underline"
            >
              {t('createAccount', 'Create one')}
            </a>
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
        <div className="text-center text-xs text-gray-500 mt-4">
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