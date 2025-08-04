import { 
  formatBytes,
  formatNumber,
  formatPercentage,
  formatCurrency,
  truncateText,
  capitalizeFirst,
  slugify 
} from '../format';

describe('format utilities', () => {
  describe('formatBytes', () => {
    it('formats bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(1500)).toBe('1.46 KB');
    });

    it('handles negative values', () => {
      expect(formatBytes(-1024)).toBe('-1 KB');
    });

    it('handles custom decimal places', () => {
      expect(formatBytes(1500, 1)).toBe('1.5 KB');
      expect(formatBytes(1500, 0)).toBe('1 KB');
    });
  });

  describe('formatNumber', () => {
    it('formats numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(123.456)).toBe('123.456');
    });

    it('handles negative numbers', () => {
      expect(formatNumber(-1000)).toBe('-1,000');
    });

    it('handles zero', () => {
      expect(formatNumber(0)).toBe('0');
    });
  });

  describe('formatPercentage', () => {
    it('formats percentages correctly', () => {
      expect(formatPercentage(0.5)).toBe('50.00%');
      expect(formatPercentage(1)).toBe('100.00%');
      expect(formatPercentage(0.1234)).toBe('12.34%');
    });

    it('handles custom decimal places', () => {
      expect(formatPercentage(0.1234, 1)).toBe('12.3%');
      expect(formatPercentage(0.1234, 0)).toBe('12%');
    });

    it('handles edge cases', () => {
      expect(formatPercentage(0)).toBe('0.00%');
      expect(formatPercentage(-0.5)).toBe('-50.00%');
    });
  });

  describe('formatCurrency', () => {
    it('formats USD currency by default', () => {
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('supports different currencies', () => {
      expect(formatCurrency(100, 'EUR')).toBe('€100.00');
      expect(formatCurrency(100, 'GBP')).toBe('£100.00');
    });

    it('supports different locales', () => {
      // The space between number and € symbol might be non-breaking space
      const result = formatCurrency(1234.56, 'EUR', 'de-DE');
      expect(result).toMatch(/1\.234,56[\s\u00A0]€/);
    });
  });

  describe('truncateText', () => {
    it('truncates long text', () => {
      const longText = 'This is a very long text that needs to be truncated';
      expect(truncateText(longText, 20)).toBe('This is a very long ...');
    });

    it('returns original text if shorter than limit', () => {
      expect(truncateText('Short text', 20)).toBe('Short text');
    });

    it('handles custom ellipsis', () => {
      expect(truncateText('Long text here', 9, '…')).toBe('Long text…');
    });

    it('handles empty string', () => {
      expect(truncateText('', 10)).toBe('');
    });
  });

  describe('capitalizeFirst', () => {
    it('capitalizes first letter', () => {
      expect(capitalizeFirst('hello')).toBe('Hello');
      expect(capitalizeFirst('hello world')).toBe('Hello world');
    });

    it('handles already capitalized text', () => {
      expect(capitalizeFirst('Hello')).toBe('Hello');
    });

    it('handles empty string', () => {
      expect(capitalizeFirst('')).toBe('');
    });

    it('handles single character', () => {
      expect(capitalizeFirst('a')).toBe('A');
    });
  });

  describe('slugify', () => {
    it('converts text to slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Test & Example')).toBe('test-example');
      expect(slugify('Multiple   Spaces')).toBe('multiple-spaces');
    });

    it('handles special characters', () => {
      expect(slugify('Hello@World!')).toBe('hello-world');
      expect(slugify('Test_123')).toBe('test-123');
    });

    it('handles accented characters', () => {
      expect(slugify('Café')).toBe('cafe');
      expect(slugify('Naïve')).toBe('naive');
    });

    it('handles empty string', () => {
      expect(slugify('')).toBe('');
    });
  });
});