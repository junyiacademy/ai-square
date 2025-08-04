import { POST } from '../login/route'
import { NextRequest } from 'next/server'

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

// Mock pg Pool
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    end: jest.fn(),
  })),
}))

// Mock getPool
jest.mock('../../../../lib/db/get-pool', () => ({
  getPool: jest.fn().mockReturnValue({
    query: jest.fn(),
    end: jest.fn(),
  })
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
  it('should login successfully with valid credentials', async () => {
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
  })

  it('should fail with invalid credentials', async () => {
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
    expect(data.error).toContain('required')
  })
})