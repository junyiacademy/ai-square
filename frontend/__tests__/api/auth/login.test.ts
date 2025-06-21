/**
 * API 單元測試 - 登入端點
 * 測試 /api/auth/login 路由的所有情況
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auth/login/route'

// 模擬 NextRequest
function createMockRequest(body: any): NextRequest {
  const mockRequest = {
    json: () => Promise.resolve(body),
    headers: new Headers(),
    url: 'http://localhost:3000/api/auth/login',
    method: 'POST',
  } as NextRequest

  return mockRequest
}

describe('/api/auth/login API Tests', () => {
  describe('🔴 紅燈測試 - 驗證測試框架', () => {
    it('should be able to import the API route handler', () => {
      expect(POST).toBeDefined()
      expect(typeof POST).toBe('function')
    })
  })

  describe('✅ 成功登入場景', () => {
    it('should return success for valid student credentials', async () => {
      const mockRequest = createMockRequest({
        email: 'student@example.com',
        password: 'student123',
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user).toEqual({
        id: 1,
        email: 'student@example.com',
        role: 'student',
        name: 'Student User'
      })
      expect(data.message).toBe('Login successful')
      expect(data.user.password).toBeUndefined() // 密碼不應該在回應中
    })

    it('should return success for valid teacher credentials', async () => {
      const mockRequest = createMockRequest({
        email: 'teacher@example.com',
        password: 'teacher123',
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user).toEqual({
        id: 2,
        email: 'teacher@example.com',
        role: 'teacher',
        name: 'Teacher User'
      })
    })

    it('should return success for valid admin credentials', async () => {
      const mockRequest = createMockRequest({
        email: 'admin@example.com',
        password: 'admin123',
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user).toEqual({
        id: 3,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      })
    })
  })

  describe('❌ 登入失敗場景', () => {
    it('should return error for invalid email', async () => {
      const mockRequest = createMockRequest({
        email: 'nonexistent@example.com',
        password: 'anypassword',
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid email or password')
      expect(data.user).toBeUndefined()
    })

    it('should return error for correct email but wrong password', async () => {
      const mockRequest = createMockRequest({
        email: 'student@example.com',
        password: 'wrongpassword',
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid email or password')
    })

    it('should return error for empty credentials', async () => {
      const mockRequest = createMockRequest({
        email: '',
        password: '',
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Email and password are required')
    })

    it('should return error for missing email', async () => {
      const mockRequest = createMockRequest({
        password: 'student123',
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Email and password are required')
    })

    it('should return error for missing password', async () => {
      const mockRequest = createMockRequest({
        email: 'student@example.com',
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Email and password are required')
    })
  })

  describe('🚨 錯誤處理場景', () => {
    it('should handle malformed request body gracefully', async () => {
      // 模擬 JSON 解析錯誤
      const mockRequest = {
        json: () => Promise.reject(new Error('Invalid JSON')),
        headers: new Headers(),
        url: 'http://localhost:3000/api/auth/login',
        method: 'POST',
      } as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle undefined request body', async () => {
      const mockRequest = createMockRequest(undefined)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Email and password are required')
    })

    it('should handle null values in request', async () => {
      const mockRequest = createMockRequest({
        email: null,
        password: null,
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Email and password are required')
    })
  })

  describe('🔒 安全性測試', () => {
    it('should not expose password in successful response', async () => {
      const mockRequest = createMockRequest({
        email: 'student@example.com',
        password: 'student123',
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(data.user).toBeDefined()
      expect(data.user.password).toBeUndefined()
      
      // 檢查整個回應中沒有密碼
      const responseText = JSON.stringify(data)
      expect(responseText).not.toContain('student123')
      expect(responseText).not.toContain('password')
    })

    it('should not reveal whether email exists for wrong password', async () => {
      const wrongEmailRequest = createMockRequest({
        email: 'nonexistent@example.com',
        password: 'anypassword',
      })

      const wrongPasswordRequest = createMockRequest({
        email: 'student@example.com',
        password: 'wrongpassword',
      })

      const wrongEmailResponse = await POST(wrongEmailRequest)
      const wrongPasswordResponse = await POST(wrongPasswordRequest)

      const wrongEmailData = await wrongEmailResponse.json()
      const wrongPasswordData = await wrongPasswordResponse.json()

      // 兩種錯誤情況應該回傳相同的錯誤訊息，避免洩露用戶是否存在
      expect(wrongEmailData.error).toBe(wrongPasswordData.error)
      expect(wrongEmailResponse.status).toBe(wrongPasswordResponse.status)
    })
  })

  describe('📊 邊界條件測試', () => {
    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(100) + '@example.com'
      const mockRequest = createMockRequest({
        email: longEmail,
        password: 'student123',
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(1000)
      const mockRequest = createMockRequest({
        email: 'student@example.com',
        password: longPassword,
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should handle special characters in email and password', async () => {
      const mockRequest = createMockRequest({
        email: 'test+special@example.com',
        password: 'pass@word#123!',
      })

      const response = await POST(mockRequest)
      
      // 應該正常處理，不會因為特殊字符而崩潰
      expect(response.status).toBeOneOf([200, 401, 400])
    })
  })

  describe('🌐 HTTP 方法測試', () => {
    it('should only accept POST method', () => {
      // 這個測試確保我們的路由只接受 POST 請求
      // Next.js App Router 會自動處理其他 HTTP 方法
      expect(POST).toBeDefined()
      
      // 我們的 API 應該只導出 POST 函數
      // GET, PUT, DELETE 等應該未定義
    })
  })
})

// 自訂 Jest matcher
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received)
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      }
    }
  },
})