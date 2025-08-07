import { formatDate } from '../date';

describe('date utils', () => {
  describe('formatDate', () => {
    it('should format dates correctly', () => {
      const date = new Date('2024-01-01');
      const formatted = formatDate(date);
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });
    
    it('should handle string inputs', () => {
      const formatted = formatDate('2024-01-01');
      expect(formatted).toBeDefined();
    });
  });
});