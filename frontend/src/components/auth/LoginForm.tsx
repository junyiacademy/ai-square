'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface LoginFormProps {
  onSubmit: (credentials: { email: string; password: string; rememberMe: boolean }) => void
  loading?: boolean
  error?: string
}

export function LoginForm({ onSubmit, loading = false, error }: LoginFormProps) {
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!loading) {
      onSubmit({ email, password, rememberMe })
    }
  }

  // 示範帳號資料
  const demoAccounts = [
    { email: 'student@example.com', password: 'student123', label: 'Student', role: 'student' },
    { email: 'teacher@example.com', password: 'teacher123', label: 'Teacher', role: 'teacher' },
    { email: 'admin@example.com', password: 'admin123', label: 'Admin', role: 'admin' }
  ]

  const handleDemoLogin = (demoAccount: { email: string; password: string }) => {
    console.log('handleDemoLogin called with:', demoAccount)
    
    // 立即設定值
    setEmail(demoAccount.email)
    setPassword(demoAccount.password)
    
    // 使用 requestAnimationFrame 確保 React 狀態更新
    requestAnimationFrame(() => {
      console.log('requestAnimationFrame callback')
      
      // 再次確保值已設定
      const emailInput = document.getElementById('email') as HTMLInputElement
      const passwordInput = document.getElementById('password') as HTMLInputElement
      
      console.log('DOM elements found:', { 
        email: !!emailInput, 
        password: !!passwordInput 
      })
      
      if (emailInput && passwordInput) {
        emailInput.value = demoAccount.email
        passwordInput.value = demoAccount.password
        
        // 觸發 onChange 事件
        const emailEvent = new Event('input', { bubbles: true })
        const passwordEvent = new Event('input', { bubbles: true })
        emailInput.dispatchEvent(emailEvent)
        passwordInput.dispatchEvent(passwordEvent)
        
        console.log('Values set:', {
          email: emailInput.value,
          password: passwordInput.value
        })
      }
      
      // 延遲提交以確保 UI 更新
      setTimeout(() => {
        console.log('About to submit with:', { ...demoAccount, rememberMe })
        onSubmit({ ...demoAccount, rememberMe })
      }, 200)
    })
  }

  return (
    <div className="space-y-6">
      {/* 錯誤訊息 */}
      {error && (
        <div 
          role="alert" 
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg"
        >
          {error}
        </div>
      )}

      {/* 登入表單 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label 
            htmlFor="email" 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {t('email')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white"
            placeholder="student@example.com"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label 
            htmlFor="password" 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {t('password')}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white"
            placeholder="student123"
            required
            disabled={loading}
          />
        </div>

        {/* Remember Me 複選框 */}
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={loading}
            />
            <span className="ml-2 text-sm text-gray-700">
              {t('rememberMe', 'Remember me')}
            </span>
          </label>
          <a href="#" className="text-sm text-blue-600 hover:text-blue-500">
            {t('forgotPassword', 'Forgot password?')}
          </a>
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t('loading') : t('login')}
        </button>
      </form>

      {/* 分隔線 */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">{t('or')}</span>
        </div>
      </div>

      {/* 測試帳戶快速登入 */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700 text-center">
          {t('testAccounts.title')}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {demoAccounts.map((account, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                console.log('Demo button clicked:', account.label)
                handleDemoLogin(account)
              }}
              disabled={loading}
              className="group flex flex-col items-center justify-center p-4 text-sm bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-lg transition-all duration-200 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md mb-2 ${
                index === 0 ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                index === 1 ? 'bg-gradient-to-br from-green-400 to-green-600' :
                'bg-gradient-to-br from-purple-400 to-purple-600'
              }`}>
                {index === 0 ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                ) : index === 1 ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>
              <span className="text-gray-700 font-medium">{account.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}