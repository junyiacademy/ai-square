import { NextRequest } from 'next/server'
import { POST } from '../route'

const mockQuery = jest.fn()
const mockLoginUser = jest.fn()
jest.mock('@/lib/auth/simple-auth', () => {
  const original = jest.requireActual('@/lib/auth/simple-auth')
  return {
    ...original,
    getPool: () => ({ query: mockQuery }),
    loginUser: (...args: any[]) => mockLoginUser(...args)
  }
})

describe('/api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('blocks unverified users', async () => {
    // email_verified = false
    mockQuery.mockResolvedValueOnce({ rows: [{ email_verified: false }] })

    const req = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'u@example.com', password: 'x' })
    } as any)

    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json.success).toBe(false)
    expect(json.error).toMatch(/Email not verified/i)
  })

  it('allows verified users', async () => {
    // email_verified = true
    mockQuery.mockResolvedValueOnce({ rows: [{ email_verified: true }] })
    mockLoginUser.mockResolvedValueOnce({ success: true, user: { id: 'u1', email: 'u@example.com' }, token: 'tok' })

    const req = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'u@example.com', password: 'x' })
    } as any)

    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })
})
