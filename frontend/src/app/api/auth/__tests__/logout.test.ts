import { POST } from '../logout/route'

// Mock AuthManager
jest.mock('@/lib/auth/auth-manager', () => ({
  AuthManager: {
    clearAuthCookies: jest.fn()
  }
}))

describe('/api/auth/logout', () => {
  it('should clear all auth cookies', async () => {
    const { AuthManager } = require('@/lib/auth/auth-manager')
    
    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Logged out successfully')

    // Check that AuthManager.clearAuthCookies was called with the response
    expect(AuthManager.clearAuthCookies).toHaveBeenCalledWith(expect.any(Object))
  })
})