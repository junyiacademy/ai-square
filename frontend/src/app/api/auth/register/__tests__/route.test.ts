import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock mailer
jest.mock('@/lib/email/mailer', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  appBaseUrl: () => 'http://localhost:3000'
}))

// Mock DB pool from simple-auth
const mockQuery = jest.fn()
jest.mock('@/lib/auth/simple-auth', () => {
  const original = jest.requireActual('@/lib/auth/simple-auth')
  return {
    ...original,
    getPool: () => ({ query: mockQuery })
  }
})

describe('/api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('registers a new user and sends verification email', async () => {
    // SELECT existing user → none
    mockQuery.mockResolvedValueOnce({ rows: [] })
    // INSERT new user
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })

    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'newuser@example.com', password: 'Passw0rd!', name: 'New User' })
    } as any)

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    // SELECT + INSERT calls
    expect(mockQuery).toHaveBeenCalled()
    const { sendEmail } = require('@/lib/email/mailer')
    expect(sendEmail).toHaveBeenCalled()
  })

  it('returns 409 if email already verified', async () => {
    // SELECT existing verified user
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'u1', email_verified: true, name: 'X' }] })

    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'exists@example.com', password: 'Passw0rd!' })
    } as any)

    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.success).toBe(false)
  })
})
