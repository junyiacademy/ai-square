import { POST } from '../logout/route'
import { cookies } from 'next/headers'

// Mock cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

describe('/api/auth/logout', () => {
  it('should clear all auth cookies', async () => {
    const mockCookieStore = {
      delete: jest.fn(),
    }
    ;(cookies as jest.Mock).mockResolvedValue(mockCookieStore)

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Logged out successfully')

    // Check delete methods were called on cookieStore
    expect(mockCookieStore.delete).toHaveBeenCalledWith('accessToken')
    expect(mockCookieStore.delete).toHaveBeenCalledWith('refreshToken')
    expect(mockCookieStore.delete).toHaveBeenCalledWith('isLoggedIn')
    expect(mockCookieStore.delete).toHaveBeenCalledWith('userRole')
    expect(mockCookieStore.delete).toHaveBeenCalledWith('user')
    expect(mockCookieStore.delete).toHaveBeenCalledWith('rememberMe')
    expect(mockCookieStore.delete).toHaveBeenCalledTimes(6)
  })
})