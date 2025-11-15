import { POST } from '../route';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// Mock cookies set
const mockCookiesSet = jest.fn();

// Mock AuthManager
jest.mock('@/lib/auth/auth-manager', () => ({
  AuthManager: {
    clearAuthCookies: jest.fn((response) => {
      // Mock the actual behavior of clearing auth cookies
      if (response && response.cookies && response.cookies.set) {
        response.cookies.set('sessionToken', '', {
          httpOnly: true,
          secure: false, // NODE_ENV is test
          sameSite: 'lax',
          maxAge: 0,
          path: '/'
        });
      }
    })
  }
}));

// Mock SecureSession
jest.mock('@/lib/auth/secure-session', () => ({
  SecureSession: {
    destroySession: jest.fn()
  }
}));

// Mock NextResponse but keep NextRequest
jest.mock('next/server', () => ({
  NextRequest: jest.requireActual('next/server').NextRequest,
  NextResponse: {
    json: (data: any, init?: ResponseInit) => {
      const response = new Response(JSON.stringify(data), init);
      Object.defineProperty(response, 'cookies', {
        value: { set: mockCookiesSet },
        writable: false,
      });
      return response;
    }
  }
}));

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

describe('/api/auth/logout', () => {
  const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCookiesSet.mockClear();

    // Mock the cookies function
    const mockCookieStore = {
      delete: jest.fn()
    };
    mockCookies.mockResolvedValue(mockCookieStore as any);
  });
  describe('POST', () => {
    it('should logout successfully and clear cookies', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/logout');
      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Logged out successfully');

      // Check that sessionToken cookie is cleared with maxAge=0
      expect(mockCookiesSet).toHaveBeenCalledWith('sessionToken', '', expect.objectContaining({ maxAge: 0 }));
    });

    it('should have proper cookie settings', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/logout');
      const response = await POST(mockRequest);

      // Check that all cookies have proper security settings
      expect(mockCookiesSet).toHaveBeenCalledWith(
        expect.any(String),
        '',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/'
        })
      );
    });
  });

});
