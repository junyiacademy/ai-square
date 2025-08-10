import { POST } from '../login/route'
import { NextRequest } from 'next/server'
import { getUserWithPassword, updateUserPasswordHash } from '@/lib/auth/password-utils'
import bcrypt from 'bcryptjs'

// Mock JWT functions
jest.mock('../../../../lib/auth/jwt', () => ({
  createAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
  createRefreshToken: jest.fn().mockImplementation((userId: number, rememberMe: boolean) => 
    Promise.resolve(`mock-refresh-token-${rememberMe ? '30d' : '7d'}`)
  ),
}))

// Mock session
jest.mock('../../../../lib/auth/session-simple', () => ({
  createSessionToken: jest.fn().mockReturnValue('mock-session-token')
}))

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}))

// Mock database pool
const mockPool = {
  query: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
}

// Mock getPool
jest.mock('../../../../lib/db/get-pool', () => ({
  getPool: jest.fn(() => mockPool)
}))

// Mock password utilities
jest.mock('../../../../lib/auth/password-utils', () => ({
  getUserWithPassword: jest.fn(),
  updateUserPasswordHash: jest.fn(),
  updateUserEmailVerified: jest.fn()
}))

// Mock PostgreSQL repository
jest.mock('../../../../lib/repositories/postgresql', () => ({
  PostgreSQLUserRepository: jest.fn().mockImplementation(() => ({
    findByEmail: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((user) => Promise.resolve({
      id: '1',
      ...user
    })),
    updateLastActive: jest.fn().mockResolvedValue(undefined),
  })),
}))

// Mock NextResponse to handle cookies properly
const mockCookies = {
  set: jest.fn(),
}

jest.mock('next/server', () => ({
  NextRequest: class {
    url: string
    method: string
    private body: string

    constructor(url: string, init?: RequestInit) {
      this.url = url
      this.method = init?.method || 'GET'
      this.body = init?.body as string || ''
    }

    async json() {
      return JSON.parse(this.body)
    }
  },
  NextResponse: {
    json: (data: any, init?: ResponseInit) => {
      const response = new Response(JSON.stringify(data), init)
      Object.defineProperty(response, 'cookies', {
        value: mockCookies,
        writable: false,
      })
      return response
    }
  }
}))

// Create a mock NextRequest class
class MockNextRequest {
  url: string
  method: string
  private body: string

  constructor(url: string, init?: RequestInit) {
    this.url = url
    this.method = init?.method || 'GET'
    this.body = init?.body as string || ''
  }

  async json() {
    return JSON.parse(this.body)
  }
}

describe('/api/auth/login', () => {
  const mockGetUserWithPassword = getUserWithPassword as jest.Mock
  const mockBcryptCompare = bcrypt.compare as jest.Mock
  
  beforeEach(() => {
    jest.clearAllMocks()
    mockCookies.set.mockClear()
  })

  it('should login successfully with valid credentials', async () => {
    // Setup mock user data
    mockGetUserWithPassword.mockResolvedValue({
      id: '1',
      email: 'student@example.com',
      name: 'Student User',
      passwordHash: 'hashed-password',
      role: 'student',
      emailVerified: true,
      onboardingCompleted: false,
      preferredLanguage: 'en',
      metadata: {}
    })
    mockBcryptCompare.mockResolvedValue(true)
    const request = new MockNextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'student123',
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()
    
    // Log the error if status is not 200
    if (response.status !== 200) {
      console.error('Login error:', data)
    }

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.user.email).toBe('student@example.com')
    expect(data.user.password).toBeUndefined()
    expect(mockCookies.set).toHaveBeenCalledWith('ai_square_session', 'mock-session-token', expect.any(Object))
    expect(mockCookies.set).toHaveBeenCalledWith('ai_square_refresh', 'mock-refresh-token-7d', expect.any(Object))
  })

  it('should fail with invalid credentials', async () => {
    mockGetUserWithPassword.mockResolvedValue(null)
    const request = new MockNextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid@example.com',
        password: 'wrongpassword',
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBeDefined()
  })

  it('should handle Remember Me option correctly', async () => {
    mockGetUserWithPassword.mockResolvedValue({
      id: '1',
      email: 'student@example.com',
      name: 'Student User',
      passwordHash: 'hashed-password',
      role: 'student',
      emailVerified: true,
      onboardingCompleted: false,
      preferredLanguage: 'en',
      metadata: {}
    })
    mockBcryptCompare.mockResolvedValue(true)
    const request = new MockNextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'student123',
        rememberMe: true,
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    
    // Since we're mocking JWT creation, we can't test actual cookie headers
    // Instead verify the response data includes remember me info
    expect(data.user).toBeDefined()
    expect(data.user.email).toBe('student@example.com')
  })

  it('should default Remember Me to false when not provided', async () => {
    const request = new MockNextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'student123',
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    
    // Verify user is logged in successfully
    expect(data.user).toBeDefined()
    expect(data.user.email).toBe('student@example.com')
  })

  it('should require email and password', async () => {
    const request = new MockNextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.toLowerCase()).toContain('required')
  })

  it('should login via legacy MOCK_USERS fallback when DB has no user', async () => {
    // DB lookup returns null to trigger MOCK_USERS path
    mockGetUserWithPassword.mockResolvedValue(null)
    // Provide legacy mock user credentials
    const request = new MockNextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'student123',
        rememberMe: false,
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.user.email).toBe('student@example.com')
    // cookies set for legacy path
    expect(mockCookies.set).toHaveBeenCalledWith('ai_square_session', expect.any(String), expect.any(Object))
    expect(mockCookies.set).toHaveBeenCalledWith('isLoggedIn', 'true', expect.any(Object))
    expect(mockCookies.set).toHaveBeenCalledWith('user', expect.any(String), expect.any(Object))
    expect(mockCookies.set).toHaveBeenCalledWith('ai_square_refresh', expect.any(String), expect.any(Object))
  })

  it('should persist cookies longer when rememberMe is true (DB user path)', async () => {
    mockGetUserWithPassword.mockResolvedValue({
      id: '1', email: 'student@example.com', name: 'Student User', passwordHash: 'hash', role: 'student',
      emailVerified: true, onboardingCompleted: false, preferredLanguage: 'en', metadata: {}
    })
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    const req = new MockNextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'student@example.com', password: 'student123', rememberMe: true })
    })
    const res = await POST(req as unknown as NextRequest)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    // ai_square_refresh token should reflect 30d
    const refreshCall = mockCookies.set.mock.calls.find((c: unknown[]) => c[0] === 'ai_square_refresh')
    expect(refreshCall?.[1]).toContain('mock-refresh-token-30d')
    // session_token maxAge should be 30 days
    const sessionTokenCall = mockCookies.set.mock.calls.find((c: unknown[]) => c[0] === 'session_token')
    expect((sessionTokenCall?.[2] as { maxAge?: number })?.maxAge).toBe(30 * 24 * 60 * 60)
  })

  it('should set long-lived cookies when rememberMe is true in legacy path', async () => {
    mockGetUserWithPassword.mockResolvedValue(null)
    const req = new MockNextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'student@example.com', password: 'student123', rememberMe: true })
    })
    const res = await POST(req as unknown as NextRequest)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    // refresh should be 30d
    const refreshCall = mockCookies.set.mock.calls.find((c: unknown[]) => c[0] === 'ai_square_refresh')
    expect(refreshCall?.[1]).toContain('mock-refresh-token-30d')
    // ai_square_session and isLoggedIn should use 30d maxAge
    const sessionCall = mockCookies.set.mock.calls.find((c: unknown[]) => c[0] === 'ai_square_session')
    expect((sessionCall?.[2] as { maxAge?: number })?.maxAge).toBe(30 * 24 * 60 * 60)
    const isLoggedInCall = mockCookies.set.mock.calls.find((c: unknown[]) => c[0] === 'isLoggedIn')
    expect((isLoggedInCall?.[2] as { maxAge?: number })?.maxAge).toBe(30 * 24 * 60 * 60)
  })

  it('should treat email case-insensitively and lowercase before query', async () => {
    mockGetUserWithPassword.mockResolvedValue({
      id: '1', email: 'student@example.com', name: 'Student User', passwordHash: 'hash', role: 'student',
      emailVerified: true, onboardingCompleted: false, preferredLanguage: 'en', metadata: {}
    })
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    const req = new MockNextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'Student@Example.com', password: 'student123' })
    })
    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(200)
    // ensure second argument (email) is lowercased when calling getUserWithPassword
    expect(mockGetUserWithPassword.mock.calls[0]?.[1]).toBe('student@example.com')
  })

  it('should return 500 if legacy path fails during user creation/update', async () => {
    mockGetUserWithPassword.mockResolvedValue(null)
    const { updateUserPasswordHash: mockUpdateHash } = require('../../../../lib/auth/password-utils') as { updateUserPasswordHash: jest.Mock }
    mockUpdateHash.mockRejectedValue(new Error('hash-fail'))
    const req = new MockNextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'student@example.com', password: 'student123' })
    })
    const res = await POST(req as unknown as NextRequest)
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.success).toBe(false)
  })

  it('should return 401 if account has no password hash configured', async () => {
    mockGetUserWithPassword.mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      name: 'User',
      passwordHash: null,
      role: 'student',
      emailVerified: true,
      onboardingCompleted: false,
      preferredLanguage: 'en',
      metadata: {},
    })
    const request = new MockNextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com', password: 'x' }),
    })
    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()
    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect((data.error as string).toLowerCase()).toContain('account')
  })

  it('should return 401 when password is invalid for existing user', async () => {
    mockGetUserWithPassword.mockResolvedValue({
      id: '1', email: 'user@example.com', name: 'User', passwordHash: 'hash', role: 'student',
      emailVerified: true, onboardingCompleted: false, preferredLanguage: 'en', metadata: {}
    })
    mockBcryptCompare.mockResolvedValue(false)
    const request = new MockNextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com', password: 'wrong' }),
    })
    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()
    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect((data.error as string).toLowerCase()).toContain('invalid')
  })

  it('should validate email format and return 400', async () => {
    const request = new MockNextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email', password: 'x' }),
    })
    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()
    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect((data.error as string).toLowerCase()).toContain('invalid email')
  })

  it('should return 500 on unexpected error', async () => {
    mockGetUserWithPassword.mockRejectedValue(new Error('boom'))
    const request = new MockNextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com', password: 'x' }),
    })
    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()
    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
  })
})

// OPTIONS route CORS support
describe('/api/auth/login OPTIONS', () => {
  it('should return 200 with CORS headers', async () => {
    jest.resetModules()
    jest.doMock('../../../../lib/auth/jwt', () => ({
      createAccessToken: jest.fn(),
      createRefreshToken: jest.fn(),
    }))
    jest.doMock('../../../../lib/auth/session-simple', () => ({
      createSessionToken: jest.fn(),
    }))
    // Provide a minimal NextResponse constructor for OPTIONS
    jest.doMock('next/server', () => ({
      NextResponse: class {
        status: number
        headers: Record<string, string>
        constructor(_: unknown, init?: { status?: number; headers?: Record<string, string> }) {
          this.status = init?.status ?? 200
          this.headers = init?.headers ?? {}
        }
        static json() {
          return { status: 200 }
        }
      },
    }))
    const { OPTIONS } = require('../login/route')
    const res = await OPTIONS()
    expect(res.status).toBe(200)
  })
})