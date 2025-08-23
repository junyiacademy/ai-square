import { POST } from '../route';
import { cookies } from 'next/headers';

// Mock cookies set
const mockCookiesSet = jest.fn();

// Mock NextResponse
jest.mock('next/server', () => ({
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
      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Logged out successfully');

      // Check that sessionToken cookie is cleared with maxAge=0
      expect(mockCookiesSet).toHaveBeenCalledWith('sessionToken', '', expect.objectContaining({ maxAge: 0 }));
    });

    it('should have proper cookie settings', async () => {
      const response = await POST();

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