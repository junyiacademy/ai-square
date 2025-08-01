import { formatDateSafely, formatDateTime } from '../date';

describe('date utils', () => {
  describe('formatDateSafely', () => {
    it('formats valid date with default locale', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = formatDateSafely(date);
      expect(result).toMatch(/Jan 15, 2024/);
    });

    it('formats date string', () => {
      const result = formatDateSafely('2024-01-15T12:00:00Z');
      expect(result).toMatch(/Jan 15, 2024/);
    });

    it('formats date with custom locale', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = formatDateSafely(date, 'fr-FR');
      expect(result).toMatch(/15 janv\. 2024|15 jan\. 2024/);
    });

    it('returns fallback for null', () => {
      const result = formatDateSafely(null);
      expect(result).toBe('N/A');
    });

    it('returns fallback for undefined', () => {
      const result = formatDateSafely(undefined);
      expect(result).toBe('N/A');
    });

    it('returns custom fallback', () => {
      const result = formatDateSafely(null, 'en-US', 'Unknown');
      expect(result).toBe('Unknown');
    });

    it('returns fallback for invalid date string', () => {
      const result = formatDateSafely('invalid-date');
      expect(result).toBe('N/A');
    });

    it('returns fallback for invalid Date object', () => {
      const invalidDate = new Date('invalid');
      const result = formatDateSafely(invalidDate);
      expect(result).toBe('N/A');
    });

    it('handles empty string', () => {
      const result = formatDateSafely('');
      expect(result).toBe('N/A');
    });

    it('formats valid ISO string', () => {
      const result = formatDateSafely('2024-12-25T00:00:00Z');
      expect(result).toMatch(/Dec 25, 2024/);
    });
  });

  describe('formatDateTime', () => {
    it('formats valid date with time', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = formatDateTime(date);
      expect(result).toMatch(/Jan 15, 2024.*2:30 PM|14:30/); // Time format varies by system locale
    });

    it('formats date string with time', () => {
      const result = formatDateTime('2024-01-15T09:45:00Z');
      expect(result).toMatch(/Jan 15, 2024.*9:45 AM|09:45/);
    });

    it('formats with custom locale', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = formatDateTime(date, 'de-DE');
      expect(result).toMatch(/15\. Jan\. 2024/);
    });

    it('returns fallback for null', () => {
      const result = formatDateTime(null);
      expect(result).toBe('N/A');
    });

    it('returns fallback for undefined', () => {
      const result = formatDateTime(undefined);
      expect(result).toBe('N/A');
    });

    it('returns custom fallback', () => {
      const result = formatDateTime(null, 'en-US', 'No date');
      expect(result).toBe('No date');
    });

    it('returns fallback for invalid date string', () => {
      const result = formatDateTime('not-a-date');
      expect(result).toBe('N/A');
    });

    it('returns fallback for invalid Date object', () => {
      const invalidDate = new Date('invalid');
      const result = formatDateTime(invalidDate);
      expect(result).toBe('N/A');
    });

    it('handles midnight time', () => {
      const result = formatDateTime('2024-01-15T00:00:00Z');
      expect(result).toMatch(/Jan 15, 2024.*12:00 AM|00:00/);
    });

    it('handles noon time', () => {
      const result = formatDateTime('2024-01-15T12:00:00Z');
      expect(result).toMatch(/Jan 15, 2024.*12:00 PM|12:00/);
    });

    it('preserves timezone in formatting', () => {
      const date = new Date('2024-01-15T23:59:59Z');
      const result = formatDateTime(date);
      expect(result).toMatch(/Jan 15, 2024|Jan 16, 2024/); // Depends on system timezone
    });
  });
});
