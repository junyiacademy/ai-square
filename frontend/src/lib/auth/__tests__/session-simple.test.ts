import {
  createSessionToken,
  verifySessionToken,
  storeSessionToken,
  getSessionToken,
  clearSessionToken,
} from '../session-simple';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('session-simple', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createSessionToken', () => {
    it('creates a base64 encoded session token', () => {
      const userId = '12345';
      const email = 'test@example.com';
      const now = Date.now();
      jest.setSystemTime(now);
      
      const token = createSessionToken(userId, email);
      
      // Decode the token
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      
      expect(decoded).toEqual({
        userId,
        email,
        timestamp: now,
        rememberMe: false,
      });
    });

    it('creates different tokens for different users', () => {
      const token1 = createSessionToken('user1', 'user1@example.com');
      const token2 = createSessionToken('user2', 'user2@example.com');
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifySessionToken', () => {
    it('verifies and decodes a valid token', () => {
      const userId = '12345';
      const email = 'test@example.com';
      const token = createSessionToken(userId, email);
      
      const result = verifySessionToken(token);
      
      expect(result).toMatchObject({
        userId,
        email,
      });
      expect(result?.timestamp).toBeDefined();
    });

    it('returns null for an expired token', () => {
      const token = createSessionToken('12345', 'test@example.com');
      
      // Advance time by more than 24 hours
      jest.advanceTimersByTime(25 * 60 * 60 * 1000);
      
      const result = verifySessionToken(token);
      
      expect(result).toBeNull();
    });

    it('returns null for an invalid token', () => {
      const invalidTokens = [
        'invalid-base64',
        Buffer.from('invalid json').toString('base64'),
        Buffer.from('{}').toString('base64'), // Missing required fields
        '',
      ];
      
      invalidTokens.forEach(token => {
        const result = verifySessionToken(token);
        expect(result).toBeNull();
      });
    });

    it('accepts token within valid time window', () => {
      const token = createSessionToken('12345', 'test@example.com');
      
      // Advance time by 23 hours (still valid)
      jest.advanceTimersByTime(23 * 60 * 60 * 1000);
      
      const result = verifySessionToken(token);
      
      expect(result).not.toBeNull();
      expect(result?.userId).toBe('12345');
    });
  });

  describe('storeSessionToken', () => {
    it('stores token in localStorage', () => {
      const token = 'test-token-123';
      
      storeSessionToken(token);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('ai_square_session', token);
    });

    it.skip('does nothing when window is undefined', () => {
      const originalWindow = global.window;
      
      // Clear any previous calls
      jest.clearAllMocks();
      
      jest.isolateModules(() => {
        // Mock window to be undefined within the isolated module
        Object.defineProperty(global, 'window', {
          value: undefined,
          writable: true,
          configurable: true
        });
        
        const { storeSessionToken: ssrStore } = require('../session-simple');
        ssrStore('test-token');
      });
      
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      
      global.window = originalWindow;
    });
  });

  describe('getSessionToken', () => {
    it('retrieves token from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValueOnce('stored-token');
      
      const token = getSessionToken();
      
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('ai_square_session');
      expect(token).toBe('stored-token');
    });

    it('returns null when no token is stored', () => {
      mockLocalStorage.getItem.mockReturnValueOnce(null);
      
      const token = getSessionToken();
      
      expect(token).toBeNull();
    });

    it.skip('returns null when window is undefined', () => {
      const originalWindow = global.window;
      
      // Clear any previous calls
      jest.clearAllMocks();
      
      let token: string | null = null;
      jest.isolateModules(() => {
        // @ts-ignore - intentionally making window undefined for test
        delete (global as any).window;
        
        const { getSessionToken: ssrGet } = require('../session-simple');
        token = ssrGet();
      });
      
      expect(token).toBeNull();
      expect(mockLocalStorage.getItem).not.toHaveBeenCalled();
      
      global.window = originalWindow;
    });
  });

  describe('clearSessionToken', () => {
    it('removes token from localStorage', () => {
      clearSessionToken();
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('ai_square_session');
    });

    it.skip('does nothing when window is undefined', () => {
      const originalWindow = global.window;
      
      // Clear any previous calls
      jest.clearAllMocks();
      
      jest.isolateModules(() => {
        // @ts-ignore - intentionally making window undefined for test
        delete (global as any).window;
        
        const { clearSessionToken: ssrClear } = require('../session-simple');
        ssrClear();
      });
      
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
      
      global.window = originalWindow;
    });
  });

  describe('integration', () => {
    it('complete session lifecycle', () => {
      // Create session
      const userId = 'user-123';
      const email = 'user@example.com';
      const token = createSessionToken(userId, email);
      
      // Store it
      storeSessionToken(token);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('ai_square_session', token);
      
      // Retrieve it
      mockLocalStorage.getItem.mockReturnValueOnce(token);
      const retrievedToken = getSessionToken();
      expect(retrievedToken).toBe(token);
      
      // Verify it
      const sessionData = verifySessionToken(retrievedToken!);
      expect(sessionData).toMatchObject({ userId, email });
      
      // Clear it
      clearSessionToken();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('ai_square_session');
    });
  });
});
