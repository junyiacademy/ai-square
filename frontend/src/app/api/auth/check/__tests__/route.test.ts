import { GET } from '../route';
import { cookies } from 'next/headers';

// Mock dependencies
jest.mock('next/headers');

const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

// Helper function to create mock cookie store
const createMockCookieStore = (cookies: Record<string, string> = {}) => ({
  get: jest.fn((name: string) => {
    return cookies[name] ? { value: cookies[name] } : undefined;
  }),
  set: jest.fn(),
  delete: jest.fn(),
  has: jest.fn((name: string) => Boolean(cookies[name])),
  getAll: jest.fn(() => Object.entries(cookies).map(([name, value]) => ({ name, value }))),
});

describe('/api/auth/check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session token authentication', () => {
    it('returns authenticated user when valid session token exists', async () => {
      const sessionTokenData = {
        userId: '123',
        email: 'test@example.com',
        timestamp: Date.now(),
        rememberMe: false
      };
      const sessionToken = Buffer.from(JSON.stringify(sessionTokenData)).toString('base64');

      const cookieStore = createMockCookieStore({
        sessionToken: sessionToken
      });
      
      mockCookies.mockResolvedValue(cookieStore as unknown as ReturnType<typeof mockCookies>);

      const mockRequest = new Request('http://localhost:3000/api/auth/check');
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        authenticated: true,
        user: {
          id: '123',
          email: 'test@example.com'
        }
      });
    });

    it('returns unauthenticated when no session token exists', async () => {
      const cookieStore = createMockCookieStore({});
      
      mockCookies.mockResolvedValue(cookieStore as unknown as ReturnType<typeof mockCookies>);

      const mockRequest = new Request('http://localhost:3000/api/auth/check');
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        authenticated: false,
        user: null
      });
    });

    it('returns unauthenticated when session token is invalid', async () => {
      const cookieStore = createMockCookieStore({
        sessionToken: 'invalid-token'
      });
      
      mockCookies.mockResolvedValue(cookieStore as unknown as ReturnType<typeof mockCookies>);

      const mockRequest = new Request('http://localhost:3000/api/auth/check');
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        authenticated: false,
        user: null
      });
    });

    it('handles malformed session token gracefully', async () => {
      const cookieStore = createMockCookieStore({
        sessionToken: 'not-base64-encoded'
      });
      
      mockCookies.mockResolvedValue(cookieStore as unknown as ReturnType<typeof mockCookies>);

      const mockRequest = new Request('http://localhost:3000/api/auth/check');
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        authenticated: false,
        user: null
      });
    });
  });

  describe('response format validation', () => {
    it('always includes required fields in response', async () => {
      const cookieStore = createMockCookieStore({});
      
      mockCookies.mockResolvedValue(cookieStore as unknown as ReturnType<typeof mockCookies>);

      const mockRequest = new Request('http://localhost:3000/api/auth/check');
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(data).toHaveProperty('authenticated');
      expect(data).toHaveProperty('user');
      expect(typeof data.authenticated).toBe('boolean');
    });
  });
});