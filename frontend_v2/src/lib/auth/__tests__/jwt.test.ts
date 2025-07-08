import { 
  createAccessToken, 
  createRefreshToken, 
  verifyAccessToken, 
  verifyRefreshToken,
  isTokenExpiringSoon,
  TokenPayload,
  RefreshTokenPayload
} from '../jwt';
import { jwtVerify } from 'jose';

// Mock jose
jest.mock('jose', () => {
  const mockSignMethods = {
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock-token')
  };
  
  return {
    SignJWT: jest.fn().mockImplementation(() => mockSignMethods),
    jwtVerify: jest.fn()
  };
});

describe('JWT utilities', () => {
  const mockJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('createAccessToken', () => {
    it('should create access token with user payload', async () => {
      const payload = {
        userId: 1,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User'
      };

      const token = await createAccessToken(payload);
      
      expect(token).toBe('mock-token');
    });

    it('should use default secret when JWT_SECRET is not set', async () => {
      delete process.env.JWT_SECRET;
      
      const payload = {
        userId: 1,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User'
      };

      const token = await createAccessToken(payload);
      
      expect(token).toBe('mock-token');
    });
  });

  describe('createRefreshToken', () => {
    it('should create refresh token without remember me', async () => {
      const token = await createRefreshToken(1);
      
      expect(token).toBe('mock-token');
    });

    it('should create refresh token with remember me', async () => {
      const token = await createRefreshToken(1, true);
      
      expect(token).toBe('mock-token');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', async () => {
      const mockPayload: TokenPayload = {
        userId: 1,
        email: 'test@example.com',
        role: 'student',
        name: 'Test User',
        exp: Math.floor(Date.now() / 1000) + 900 // 15 minutes
      };

      mockJwtVerify.mockResolvedValue({ payload: mockPayload } as any);

      const result = await verifyAccessToken('valid-token');
      
      expect(result).toEqual(mockPayload);
      expect(mockJwtVerify).toHaveBeenCalled();
      expect(mockJwtVerify.mock.calls[0][0]).toBe('valid-token');
    });

    it('should return null for invalid token', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Invalid token'));

      const result = await verifyAccessToken('invalid-token');
      
      expect(result).toBeNull();
    });

    it('should handle verification errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockJwtVerify.mockRejectedValue(new Error('Token expired'));

      const result = await verifyAccessToken('expired-token');
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Access token verification failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', async () => {
      const mockPayload: RefreshTokenPayload = {
        userId: 1,
        exp: Math.floor(Date.now() / 1000) + 86400 // 1 day
      };

      mockJwtVerify.mockResolvedValue({ payload: mockPayload } as any);

      const result = await verifyRefreshToken('valid-refresh-token');
      
      expect(result).toEqual(mockPayload);
    });

    it('should return null for invalid refresh token', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Invalid token'));

      const result = await verifyRefreshToken('invalid-token');
      
      expect(result).toBeNull();
    });

    it('should handle verification errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockJwtVerify.mockRejectedValue(new Error('Token expired'));

      const result = await verifyRefreshToken('expired-token');
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Refresh token verification failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('isTokenExpiringSoon', () => {
    it('should return true if no expiration provided', () => {
      expect(isTokenExpiringSoon(undefined)).toBe(true);
    });

    it('should return true if token expires within 5 minutes', () => {
      const now = Math.floor(Date.now() / 1000);
      const fourMinutesFromNow = now + 240; // 4 minutes
      
      expect(isTokenExpiringSoon(fourMinutesFromNow)).toBe(true);
    });

    it('should return false if token expires after 5 minutes', () => {
      const now = Math.floor(Date.now() / 1000);
      const tenMinutesFromNow = now + 600; // 10 minutes
      
      expect(isTokenExpiringSoon(tenMinutesFromNow)).toBe(false);
    });

    it('should return true if token is already expired', () => {
      const now = Math.floor(Date.now() / 1000);
      const oneMinuteAgo = now - 60;
      
      expect(isTokenExpiringSoon(oneMinuteAgo)).toBe(true);
    });

    it('should handle edge case at exactly 5 minutes', () => {
      const now = Math.floor(Date.now() / 1000);
      const exactlyFiveMinutes = now + 300; // 5 minutes
      
      expect(isTokenExpiringSoon(exactlyFiveMinutes)).toBe(false);
    });
  });
});