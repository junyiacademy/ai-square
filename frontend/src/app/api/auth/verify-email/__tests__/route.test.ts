import { NextRequest } from 'next/server'
import { GET } from '../route'

const mockQuery = jest.fn()
jest.mock('@/lib/auth/simple-auth', () => {
  const original = jest.requireActual('@/lib/auth/simple-auth')
  return {
    ...original,
    getPool: () => ({ query: mockQuery })
  }
})

describe('/api/auth/verify-email', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    // Set APP_BASE_URL for tests
    process.env.APP_BASE_URL = 'http://localhost:3000'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('verifies with valid token and redirects success', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })
    const url = 'http://localhost/api/auth/verify-email?email=test%40example.com&token=abcd'
    const req = new NextRequest(url)
    const res = await GET(req)

    expect(res.status).toBe(307) // NextJS uses 307 for temporary redirect
    expect(res.headers.get('location')).toContain('/login?verified=1')
  })

  it('redirects failure when invalid token', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 })
    const url = 'http://localhost/api/auth/verify-email?email=test%40example.com&token=bad'
    const req = new NextRequest(url)
    const res = await GET(req)
    expect(res.status).toBe(307) // NextJS uses 307 for temporary redirect
    expect(res.headers.get('location')).toContain('/login?verified=0')
  })
})
