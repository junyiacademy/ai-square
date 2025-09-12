import { NextRequest } from 'next/server'
import { POST } from '../route'

jest.mock('@/lib/email/mailer', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  appBaseUrl: () => 'http://localhost:3000'
}))

const mockQuery = jest.fn()
jest.mock('@/lib/auth/simple-auth', () => {
  const original = jest.requireActual('@/lib/auth/simple-auth')
  return {
    ...original,
    getPool: () => ({ query: mockQuery })
  }
})

describe('/api/auth/forgot-password', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sends reset email for existing user', async () => {
    // SELECT user exists
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'u1', name: 'User' }] })
    // UPDATE user reset token
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })

    const req = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com' })
    } as any)

    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    const { sendEmail } = require('@/lib/email/mailer')
    expect(sendEmail).toHaveBeenCalled()
  })

  it('returns success without sending for unknown email', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const req = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'unknown@example.com' })
    } as any)

    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    const { sendEmail } = require('@/lib/email/mailer')
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
