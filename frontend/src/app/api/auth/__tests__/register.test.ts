import { POST } from '../register/route'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { emailService } from '@/lib/email/email-service'
import { verificationTokens } from '@/lib/auth/verification-tokens'
import { updateUserPasswordHash } from '@/lib/auth/password-utils'

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn()
}))

// Mock email service and mailer
jest.mock('../../../../lib/email/email-service', () => ({
  emailService: {
    sendVerificationEmail: jest.fn()
  }
}))

// Mock mailer module
jest.mock('../../../../lib/email/mailer', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  appBaseUrl: jest.fn((origin) => origin || 'http://localhost:3000')
}))

// Mock verification tokens
jest.mock('../../../../lib/auth/verification-tokens', () => ({
  verificationTokens: {
    set: jest.fn()
  }
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
  updateUserPasswordHash: jest.fn()
}))

// Mock user repository
const mockUserRepo = {
  findByEmail: jest.fn(),
  create: jest.fn()
}

// Mock repository factory
jest.mock('../../../../lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getUserRepository: jest.fn(() => mockUserRepo)
  }
}))

// Mock AuthManager
jest.mock('../../../../lib/auth/auth-manager', () => ({
  AuthManager: {
    setAuthCookie: jest.fn()
  }
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

// Mock crypto for consistent token generation - CRITICAL FIX for createHash
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'mock-verification-token')
  })),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hash-digest')
  })),
  randomUUID: jest.fn(() => 'mock-uuid'),
  // Add default export for ES6 modules
  default: {
    randomBytes: jest.fn(() => ({
      toString: jest.fn(() => 'mock-verification-token')
    })),
    createHash: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn(() => 'mock-hash-digest')
    })),
    randomUUID: jest.fn(() => 'mock-uuid')
  }
}))

// Create a mock NextRequest class with headers
class MockNextRequest {
  url: string
  method: string
  private body: string
  headers: Headers

  constructor(url: string, init?: RequestInit) {
    this.url = url
    this.method = init?.method || 'GET'
    this.body = init?.body as string || ''
    // Create mock Headers with get method
    this.headers = {
      get: jest.fn((key: string) => {
        if (key === 'origin') return 'http://localhost:3000'
        if (key === 'content-type') return 'application/json'
        return null
      }),
      has: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      forEach: jest.fn(),
      keys: jest.fn(),
      values: jest.fn(),
      entries: jest.fn()
    } as any
  }

  async json() {
    return JSON.parse(this.body)
  }
}

describe('/api/auth/register', () => {
  const mockBcryptHash = bcrypt.hash as jest.Mock
  const mockSendVerificationEmail = emailService.sendVerificationEmail as jest.Mock
  const mockUpdateUserPasswordHash = updateUserPasswordHash as jest.Mock
  const { AuthManager } = require('../../../../lib/auth/auth-manager')

  beforeEach(() => {
    jest.clearAllMocks()
    mockCookies.set.mockClear()

    // Default mock implementations
    mockBcryptHash.mockResolvedValue('hashed-password')
    mockSendVerificationEmail.mockResolvedValue(true)
    mockUpdateUserPasswordHash.mockResolvedValue(undefined)
  })

  it('should register a new user successfully', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockUserRepo.create.mockResolvedValue({
      id: '1',
      email: 'newuser@example.com',
      name: 'New User',
      preferredLanguage: 'en'
    })

    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'newuser@example.com',
        password: 'StrongPass123',
        name: 'New User',
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toContain('Registration successful')
    expect(data.user.email).toBe('newuser@example.com')
    expect(data.user.emailVerified).toBe(false)
    expect(AuthManager.setAuthCookie).toHaveBeenCalledWith(expect.any(Object), expect.any(String), false)
    expect(mockSendVerificationEmail).toHaveBeenCalled()
    expect(verificationTokens.set).toHaveBeenCalled()
  })

  it('should reject registration if email already exists', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({
      id: '1',
      email: 'existing@example.com'
    })

    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'existing@example.com',
        password: 'StrongPass123',
        name: 'User',
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.success).toBe(false)
    expect(data.error).toContain('already exists')
  })

  it('should validate password requirements', async () => {
    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'weak',
        name: 'User',
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.toLowerCase()).toContain('password')
  })

  it('should require accepting terms', async () => {
    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'StrongPass123',
        name: 'User',
        acceptTerms: false
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.toLowerCase()).toContain('terms')
  })

  it('should validate email format', async () => {
    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'not-an-email',
        password: 'StrongPass123',
        name: 'User',
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.toLowerCase()).toContain('email')
  })

  it('should validate name length', async () => {
    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'StrongPass123',
        name: 'A',
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.toLowerCase()).toContain('name')
  })

  it('should handle duplicate key database error', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockUserRepo.create.mockRejectedValue(new Error('duplicate key value violates unique constraint'))

    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'StrongPass123',
        name: 'User',
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.success).toBe(false)
    expect(data.error).toContain('already registered')
  })

  it('should handle general database errors', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockUserRepo.create.mockRejectedValue(new Error('Database connection failed'))

    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'StrongPass123',
        name: 'User',
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toContain('try again later')
  })

  it('should continue registration even if email sending fails', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockUserRepo.create.mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      name: 'User',
      preferredLanguage: 'en'
    })
    mockSendVerificationEmail.mockResolvedValue(false)

    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'StrongPass123',
        name: 'User',
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockSendVerificationEmail).toHaveBeenCalled()
  })

  it('should use preferred language if provided', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockUserRepo.create.mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      name: 'User',
      preferredLanguage: 'zh'
    })

    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'StrongPass123',
        name: 'User',
        preferredLanguage: 'zh',
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockUserRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        preferredLanguage: 'zh'
      })
    )
  })

  it('should lowercase email before checking and creating', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockUserRepo.create.mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      name: 'User',
      preferredLanguage: 'en'
    })

    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'User@Example.Com',
        password: 'StrongPass123',
        name: 'User',
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockUserRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com'
      })
    )
  })

  it('should validate password contains uppercase letter', async () => {
    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'password123',
        name: 'User',
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.toLowerCase()).toContain('uppercase')
  })

  it('should validate password contains lowercase letter', async () => {
    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'PASSWORD123',
        name: 'User',
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.toLowerCase()).toContain('lowercase')
  })

  it('should validate password contains number', async () => {
    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'StrongPassword',
        name: 'User',
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.toLowerCase()).toContain('number')
  })

  it('should reject name that is too long', async () => {
    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'StrongPass123',
        name: 'A'.repeat(101),
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.toLowerCase()).toContain('name')
  })

  it('should handle error during password hash update', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockUserRepo.create.mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      name: 'User',
      preferredLanguage: 'en'
    })
    mockUpdateUserPasswordHash.mockRejectedValue(new Error('Failed to update password'))

    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'StrongPass123',
        name: 'User',
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
  })

  it('should set secure cookie in production environment', async () => {
    const originalEnv = process.env.NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
      configurable: true
    })

    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockUserRepo.create.mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      name: 'User',
      preferredLanguage: 'en'
    })

    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'StrongPass123',
        name: 'User',
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    await response.json()

    expect(AuthManager.setAuthCookie).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(String),
      false
    )

    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true,
      configurable: true
    })
  })
})
