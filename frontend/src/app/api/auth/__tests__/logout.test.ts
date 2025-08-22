import { POST } from '../logout/route'

// Mock NextResponse to handle cookies properly
const mockCookies = {
  set: jest.fn(),
  delete: jest.fn()
};

jest.mock('next/server', () => {
  class MockNextResponse extends Response {
    cookies = mockCookies;
    
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      super(body, init);
    }
    
    static json(data: any, init?: ResponseInit) {
      const response = new MockNextResponse(JSON.stringify(data), init);
      return response;
    }
  }
  
  return {
    NextResponse: MockNextResponse
  };
});

// Mock AuthManager
jest.mock('@/lib/auth/auth-manager', () => ({
  AuthManager: {
    clearAuthCookies: jest.fn()
  }
}))

describe('/api/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should clear all auth cookies', async () => {
    const { AuthManager } = require('@/lib/auth/auth-manager')
    
    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Logged out successfully')

    // Check that AuthManager.clearAuthCookies was called
    expect(AuthManager.clearAuthCookies).toHaveBeenCalledWith(expect.any(Object))
    
    // Verify that all cookies are cleared
    const expectedCookies = ['accessToken', 'refreshToken', 'user', 'ai_square_session']
    expectedCookies.forEach(cookieName => {
      expect(mockCookies.set).toHaveBeenCalledWith(
        cookieName,
        '',
        expect.objectContaining({
          maxAge: 0,
          path: '/'
        })
      )
    })
  })
})