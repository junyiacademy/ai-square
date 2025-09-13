import { POST } from '../register/route'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { sendEmail } from '@/lib/email/mailer'

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn()
}))

// Mock mailer module
jest.mock('../../../../lib/email/mailer', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  appBaseUrl: jest.fn((origin) => origin || 'http://localhost:3000')
}))

// Mock email templates
jest.mock('../../../../lib/email/templates/verifyEmail', () => ({
  renderVerifyEmail: jest.fn(() => ({ html: '<html>test</html>', text: 'test' }))
}))

// Mock database pool
const mockPool = {
  query: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
}

// Mock simple-auth (which exports getPool)
jest.mock('../../../../lib/auth/simple-auth', () => ({
  getPool: jest.fn(() => mockPool)
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
    headers: Map<string, string>

    constructor(url: string, init?: RequestInit) {
      this.url = url
      this.method = init?.method || 'GET'
      this.body = init?.body as string || ''
      this.headers = new Map()
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

// Mock NextRequest for testing
class MockNextRequest {
  url: string
  method: string
  private body: string
  headers: Map<string, string>

  constructor(url: string, init?: RequestInit) {
    this.url = url
    this.method = init?.method || 'GET'
    this.body = init?.body as string || ''
    this.headers = new Map()
  }

  async json() {
    return JSON.parse(this.body)
  }
}

describe('/api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCookies.set.mockClear()

    // Default mock for bcrypt
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password')

    // Default mock for sendEmail
    ;(sendEmail as jest.Mock).mockResolvedValue(true)
  })

  it('should register a new user successfully', async () => {
    // Mock database responses
    mockPool.query.mockImplementation((query: string) => {
      if (query.includes('SELECT')) {
        return Promise.resolve({ rows: [] }) // No existing user
      }
      if (query.includes('INSERT')) {
        return Promise.resolve({ rows: [{ id: '1' }] }) // User created
      }
      return Promise.resolve({ rows: [] })
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
    expect(data.user.name).toBe('New User')

    // Verify database calls
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT'),
      expect.arrayContaining(['newuser@example.com'])
    )
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT'),
      expect.any(Array)
    )

    // Verify email was sent
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'newuser@example.com',
        subject: 'Verify your email'
      })
    )
  })

  it('should reject registration if email already exists', async () => {
    // Mock existing verified user
    mockPool.query.mockResolvedValue({
      rows: [{
        id: '1',
        email_verified: true,
        name: 'Existing User'
      }]
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
        password: 'short',
        name: 'User',
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.toLowerCase()).toContain('password')
    expect(data.error).toContain('8 characters')
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
        email: 'invalid-email',
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
    expect(data.error).toContain('2 characters')
  })

  it('should handle duplicate key database error', async () => {
    mockPool.query.mockImplementation((query: string) => {
      if (query.includes('SELECT')) {
        return Promise.resolve({ rows: [] })
      }
      if (query.includes('INSERT')) {
        const error: any = new Error('duplicate key value violates unique constraint')
        error.code = '23505'
        return Promise.reject(error)
      }
      return Promise.resolve({ rows: [] })
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
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.success).toBe(false)
    expect(data.error).toContain('already registered')
  })

  it('should handle general database errors', async () => {
    mockPool.query.mockRejectedValue(new Error('Database connection failed'))

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
    // Mock successful database operations
    mockPool.query.mockImplementation((query: string) => {
      if (query.includes('SELECT')) {
        return Promise.resolve({ rows: [] })
      }
      if (query.includes('INSERT')) {
        return Promise.resolve({ rows: [{ id: '1' }] })
      }
      return Promise.resolve({ rows: [] })
    })

    // Mock email sending failure
    ;(sendEmail as jest.Mock).mockRejectedValue(new Error('SMTP error'))

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
    expect(sendEmail).toHaveBeenCalled()
  })

  it('should update password for unverified existing user', async () => {
    // Mock existing unverified user
    mockPool.query.mockImplementation((query: string) => {
      if (query.includes('SELECT')) {
        return Promise.resolve({
          rows: [{
            id: '1',
            email_verified: false,
            name: 'Old Name'
          }]
        })
      }
      if (query.includes('UPDATE')) {
        return Promise.resolve({ rows: [] })
      }
      return Promise.resolve({ rows: [] })
    })

    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'NewPassword123',
        name: 'New Name',
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE'),
      expect.any(Array)
    )
  })

  it('should lowercase email before checking and creating', async () => {
    mockPool.query.mockImplementation((query: string) => {
      if (query.includes('SELECT')) {
        return Promise.resolve({ rows: [] })
      }
      if (query.includes('INSERT')) {
        return Promise.resolve({ rows: [{ id: '1' }] })
      }
      return Promise.resolve({ rows: [] })
    })

    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'USER@EXAMPLE.COM',
        password: 'StrongPass123',
        name: 'User',
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user.email).toBe('user@example.com')
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT'),
      expect.arrayContaining(['user@example.com'])
    )
  })

  it('should require email and password', async () => {
    const request = new MockNextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: '',
        password: '',
        acceptTerms: true
      }),
    })

    const response = await POST(request as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Email and password are required')
  })
})
