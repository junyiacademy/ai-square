/**
 * Unit tests for format utilities
 * Tests various formatting functions
 */

describe('Format Utilities', () => {
  describe('formatNumber', () => {
    it('should format numbers with commas', () => {
      const formatNumber = (num: number): string => {
        return new Intl.NumberFormat('en-US').format(num);
      };

      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(1234567.89)).toBe('1,234,567.89');
    });

    it('should handle zero and negative numbers', () => {
      const formatNumber = (num: number): string => {
        return new Intl.NumberFormat('en-US').format(num);
      };

      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(-1000)).toBe('-1,000');
      expect(formatNumber(-1234567)).toBe('-1,234,567');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency values', () => {
      const formatCurrency = (amount: number, currency = 'USD'): string => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency
        }).format(amount);
      };

      expect(formatCurrency(1000)).toBe('$1,000.00');
      expect(formatCurrency(99.99)).toBe('$99.99');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should support different currencies', () => {
      const formatCurrency = (amount: number, currency = 'USD'): string => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency
        }).format(amount);
      };

      expect(formatCurrency(1000, 'EUR')).toContain('1,000');
      expect(formatCurrency(1000, 'GBP')).toContain('1,000');
      expect(formatCurrency(1000, 'JPY')).toContain('1,000');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentages', () => {
      const formatPercentage = (value: number, decimals = 0): string => {
        return `${(value * 100).toFixed(decimals)}%`;
      };

      expect(formatPercentage(0.5)).toBe('50%');
      expect(formatPercentage(0.75)).toBe('75%');
      expect(formatPercentage(1)).toBe('100%');
      expect(formatPercentage(0.333, 1)).toBe('33.3%');
      expect(formatPercentage(0.6666, 2)).toBe('66.66%');
    });

    it('should handle edge cases', () => {
      const formatPercentage = (value: number, decimals = 0): string => {
        return `${(value * 100).toFixed(decimals)}%`;
      };

      expect(formatPercentage(0)).toBe('0%');
      expect(formatPercentage(0.001)).toBe('0%');
      expect(formatPercentage(0.001, 2)).toBe('0.10%');
      expect(formatPercentage(10)).toBe('1000%');
    });
  });

  describe('formatBytes', () => {
    it('should format byte sizes', () => {
      const formatBytes = (bytes: number, decimals = 2): string => {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
      };

      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(1536, 1)).toBe('1.5 KB');
    });
  });

  describe('formatDuration', () => {
    it('should format duration in seconds', () => {
      const formatDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        const parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
        
        return parts.join(' ');
      };

      expect(formatDuration(0)).toBe('0s');
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(60)).toBe('1m');
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(3600)).toBe('1h');
      expect(formatDuration(3661)).toBe('1h 1m 1s');
      expect(formatDuration(7200)).toBe('2h');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format US phone numbers', () => {
      const formatPhoneNumber = (phone: string): string => {
        const cleaned = phone.replace(/\D/g, '');
        
        if (cleaned.length === 10) {
          return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        
        if (cleaned.length === 11 && cleaned[0] === '1') {
          return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
        }
        
        return phone;
      };

      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('11234567890')).toBe('+1 (123) 456-7890');
      expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('invalid')).toBe('invalid');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const truncateText = (text: string, maxLength: number, suffix = '...'): string => {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength - suffix.length) + suffix;
      };

      expect(truncateText('Short text', 20)).toBe('Short text');
      expect(truncateText('This is a very long text that needs truncation', 20)).toBe('This is a very lo...');
      expect(truncateText('Another long text', 10, '…')).toBe('Another l…');
      expect(truncateText('', 10)).toBe('');
    });
  });

  describe('capitalizeFirstLetter', () => {
    it('should capitalize first letter', () => {
      const capitalizeFirstLetter = (str: string): string => {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
      };

      expect(capitalizeFirstLetter('hello')).toBe('Hello');
      expect(capitalizeFirstLetter('Hello')).toBe('Hello');
      expect(capitalizeFirstLetter('hello world')).toBe('Hello world');
      expect(capitalizeFirstLetter('')).toBe('');
      expect(capitalizeFirstLetter('a')).toBe('A');
    });
  });

  describe('slugify', () => {
    it('should create URL-safe slugs', () => {
      const slugify = (text: string): string => {
        return text
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      };

      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('AI & Machine Learning')).toBe('ai-machine-learning');
      expect(slugify('  Trim Spaces  ')).toBe('trim-spaces');
      expect(slugify('Multiple   Spaces')).toBe('multiple-spaces');
      expect(slugify('Special!@#$Characters')).toBe('specialcharacters');
    });
  });

  describe('formatScore', () => {
    it('should format scores with appropriate precision', () => {
      const formatScore = (score: number, maxScore = 100): string => {
        const percentage = (score / maxScore) * 100;
        
        if (percentage === 100) return '100%';
        if (percentage === 0) return '0%';
        if (percentage >= 10) return `${percentage.toFixed(0)}%`;
        if (percentage >= 1) return `${percentage.toFixed(1)}%`;
        return `${percentage.toFixed(2)}%`;
      };

      expect(formatScore(85, 100)).toBe('85%');
      expect(formatScore(100, 100)).toBe('100%');
      expect(formatScore(0, 100)).toBe('0%');
      expect(formatScore(33.333, 100)).toBe('33%');
      expect(formatScore(5.5, 100)).toBe('5.5%');
      expect(formatScore(0.5, 100)).toBe('0.50%');
      expect(formatScore(50, 200)).toBe('25%');
    });
  });
});