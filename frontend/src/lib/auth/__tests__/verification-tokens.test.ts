import { verificationTokens } from '../verification-tokens';

describe('verification-tokens', () => {
  describe('verificationTokens', () => {
    it('should be defined', () => {
      expect(verificationTokens).toBeDefined();
    });

    it('should be a Map', () => {
      expect(verificationTokens).toBeInstanceOf(Map);
    });

    it('should support basic Map operations', () => {
      const testToken = { email: 'test@example.com', expiresAt: new Date() };
      verificationTokens.set('test-key', testToken);

      expect(verificationTokens.has('test-key')).toBe(true);
      expect(verificationTokens.get('test-key')).toEqual(testToken);

      verificationTokens.delete('test-key');
      expect(verificationTokens.has('test-key')).toBe(false);
    });

    it('should clear all tokens', () => {
      verificationTokens.set('key1', { email: 'test1@example.com', expiresAt: new Date() });
      verificationTokens.set('key2', { email: 'test2@example.com', expiresAt: new Date() });

      verificationTokens.clear();
      expect(verificationTokens.size).toBe(0);
    });
  });
});
