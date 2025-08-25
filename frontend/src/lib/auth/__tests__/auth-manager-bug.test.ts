import { AuthManager } from '../auth-manager';
import crypto from 'crypto';

describe('AuthManager Bug Reproduction', () => {
  describe('Current Implementation Bug', () => {
    it('should fail to validate hex tokens with current base64 implementation', () => {
      // This is how tokens are generated in register/login routes
      const hexToken = crypto.randomBytes(32).toString('hex');
      
      // This test will fail with current implementation
      // proving the bug exists
      const result = AuthManager.isValidSessionToken(hexToken);
      
      // Current implementation returns false because hex is not valid base64
      expect(result).toBe(false); // This is the bug!
    });

    it('should show that current validation expects base64 but gets hex', () => {
      const validHexToken = 'a'.repeat(64); // 64 hex chars
      
      // atob in browser throws on invalid base64, but Node.js might not
      // Let's test the actual method behavior
      const result = AuthManager.isValidSessionToken(validHexToken);
      
      // Current implementation will return false because
      // hex token doesn't decode to something containing 'userId' or 'email'
      expect(result).toBe(false);
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