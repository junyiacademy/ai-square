import { NextRequest } from 'next/server'
import { POST } from '../route'

const mockQuery = jest.fn()
jest.mock('@/lib/auth/simple-auth', () => {
  const original = jest.requireActual('@/lib/auth/simple-auth')
  return {
    ...original,
    getPool: () => ({ query: mockQuery })
  }
})

describe('/api/auth/reset-password', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('resets password when token valid and not expired', async () => {
    // SELECT token valid
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'u1' }] })
    // UPDATE password
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })

    const req = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com', token: 'raw', newPassword: 'NewPassw0rd!' })
    } as any)

    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('rejects invalid or expired token', async () => {
    // SELECT token invalid/expired
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const req = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com', token: 'bad', newPassword: 'NewPassw0rd!' })
    } as any)

    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })
})
