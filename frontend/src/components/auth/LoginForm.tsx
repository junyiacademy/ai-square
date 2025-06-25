'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface LoginFormProps {
  onSubmit: (credentials: { email: string; password: string }) => void
  loading?: boolean
  error?: string
}

export function LoginForm({ onSubmit, loading = false, error }: LoginFormProps) {
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!loading) {
      onSubmit({ email, password })
    }
  }

  return (
    <div className="space-y-6">
      {/* 測試帳戶提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          {t('testAccounts.title')}
        </h3>
        <div className="text-xs text-blue-600 space-y-1">
          <div>{t('testAccounts.student')}</div>
          <div>{t('testAccounts.teacher')}</div>
          <div>{t('testAccounts.admin')}</div>
        </div>
      </div>

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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white"
            placeholder="student123"
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t('loading') : t('login')}
        </button>
      </form>
    </div>
  )
}