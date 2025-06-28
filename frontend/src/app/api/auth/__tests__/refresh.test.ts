import { POST } from '../refresh/route'
import { cookies } from 'next/headers'
import * as jwt from '../../../../lib/auth/jwt'

// Mock dependencies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

jest.mock('../../../../lib/auth/jwt', () => ({
  verifyRefreshToken: jest.fn(),
  createAccessToken: jest.fn().mockResolvedValue('new-access-token'),
}))

describe('/api/auth/refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should refresh token successfully with valid refresh token', async () => {
    const mockCookieStore = {
      get: jest.fn().mockReturnValue({ value: 'valid-refresh-token' }),
    }
    ;(cookies as jest.Mock).mockResolvedValue(mockCookieStore)
    ;(jwt.verifyRefreshToken as jest.Mock).mockResolvedValue({ userId: 1 })

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Token refreshed successfully')
    
    // Verify the JWT functions were called
    expect(jwt.verifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token')
    expect(jwt.createAccessToken).toHaveBeenCalledWith({
      userId: 1,
      email: 'student@example.com',
      role: 'student',
      name: 'Student User'
    })
  })

  it('should fail when no refresh token provided', async () => {
    const mockCookieStore = {
      get: jest.fn().mockReturnValue(null),
    }
    ;(cookies as jest.Mock).mockResolvedValue(mockCookieStore)

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('No refresh token provided')
  })

  it('should fail with invalid refresh token', async () => {
    const mockCookieStore = {
      get: jest.fn().mockReturnValue({ value: 'invalid-refresh-token' }),
    }
    ;(cookies as jest.Mock).mockResolvedValue(mockCookieStore)
    ;(jwt.verifyRefreshToken as jest.Mock).mockResolvedValue(null)

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid refresh token')
  })

  it('should fail when user not found', async () => {
    const mockCookieStore = {
      get: jest.fn().mockReturnValue({ value: 'valid-refresh-token' }),
    }
    ;(cookies as jest.Mock).mockResolvedValue(mockCookieStore)
    ;(jwt.verifyRefreshToken as jest.Mock).mockResolvedValue({ userId: 999 }) // Non-existent user

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('User not found')
  })
})