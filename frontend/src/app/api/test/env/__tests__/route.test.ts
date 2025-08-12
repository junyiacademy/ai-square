import { GET } from '../route'
import { NextRequest } from 'next/server'

describe('/api/test/env', () => {
  const originalEnv = process.env.ENVIRONMENT

  afterEach(() => {
    process.env.ENVIRONMENT = originalEnv
  })

  it('should return 404 when not in staging environment', async () => {
    process.env.ENVIRONMENT = 'production'
    
    const request = new NextRequest('http://localhost:3000/api/test/env')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Not available')
  })

  it('should return environment info in staging', async () => {
    process.env.ENVIRONMENT = 'staging'
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      writable: true,
      configurable: true
    })
    process.env.NEXT_PUBLIC_APP_URL = 'http://test.com'
    process.env.NEXTAUTH_URL = 'http://test.com/api/auth'
    
    const request = new NextRequest('http://localhost:3000/api/test/env')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ENVIRONMENT).toBe('staging')
    expect(data.NODE_ENV).toBe('test')
    expect(data.NEXT_PUBLIC_APP_URL).toBe('http://test.com')
    expect(data.NEXTAUTH_URL).toBe('http://test.com/api/auth')
  })

  it('should handle missing environment variables', async () => {
    process.env.ENVIRONMENT = 'staging'
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.NEXTAUTH_URL
    
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.NEXT_PUBLIC_APP_URL).toBe('not set')
    expect(data.NEXTAUTH_URL).toBe('not set')
  })
})