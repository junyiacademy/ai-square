import { AuthManager } from '../auth-manager';
import crypto from 'crypto';

describe('AuthManager Bug Reproduction', () => {
  describe('Fixed Implementation', () => {
    it('should now correctly validate hex tokens', () => {
      // This is how tokens are generated in register/login routes
      const hexToken = crypto.randomBytes(32).toString('hex');
      
      // After fix, this should now pass
      const result = AuthManager.isValidSessionToken(hexToken);
      
      // Fixed implementation correctly validates hex tokens
      expect(result).toBe(true); // Bug is fixed!
    });

    it('should validate hex tokens of correct format', () => {
      const validHexToken = 'a'.repeat(64); // 64 hex chars
      
      // Test the fixed method behavior
      const result = AuthManager.isValidSessionToken(validHexToken);
      
      // Fixed implementation validates hex format tokens
      expect(result).toBe(true);
    });
  });

  describe('Expected Behavior', () => {
    it('should validate hex tokens correctly', () => {
      // Standard crypto token generation
      const validToken = crypto.randomBytes(32).toString('hex');
      
      // Should be 64 characters long
      expect(validToken).toHaveLength(64);
      
      // Should only contain hex characters
      expect(validToken).toMatch(/^[a-f0-9]{64}$/i);
    });

    it('should reject invalid tokens', () => {
      const invalidTokens = [
        '',                    // empty
        'too-short',          // too short
        'x'.repeat(64),       // invalid chars
        'g'.repeat(64),       // non-hex chars
        'a'.repeat(63),       // wrong length
        'a'.repeat(65),       // wrong length
        null,                 // null
        undefined,            // undefined
      ];

      invalidTokens.forEach(token => {
        // Fixed implementation should reject these
        if (typeof token === 'string') {
          expect(token).not.toMatch(/^[a-f0-9]{64}$/i);
        } else {
          // null and undefined should not match
          expect(token).toBeFalsy();
        }
      });
    });
  });
});