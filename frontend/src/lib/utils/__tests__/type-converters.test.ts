/**
 * Unit tests for type converter utilities
 * Tests safe type conversions and validations
 */

describe('Type Converters', () => {
  describe('toBoolean', () => {
    it('should convert truthy values to true', () => {
      const toBoolean = (value: unknown): boolean => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
        }
        if (typeof value === 'number') return value !== 0;
        return Boolean(value);
      };

      expect(toBoolean(true)).toBe(true);
      expect(toBoolean('true')).toBe(true);
      expect(toBoolean('TRUE')).toBe(true);
      expect(toBoolean('1')).toBe(true);
      expect(toBoolean('yes')).toBe(true);
      expect(toBoolean('on')).toBe(true);
      expect(toBoolean(1)).toBe(true);
      expect(toBoolean(100)).toBe(true);
    });

    it('should convert falsy values to false', () => {
      const toBoolean = (value: unknown): boolean => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
        }
        if (typeof value === 'number') return value !== 0;
        return Boolean(value);
      };

      expect(toBoolean(false)).toBe(false);
      expect(toBoolean('false')).toBe(false);
      expect(toBoolean('0')).toBe(false);
      expect(toBoolean('no')).toBe(false);
      expect(toBoolean('off')).toBe(false);
      expect(toBoolean(0)).toBe(false);
      expect(toBoolean(null)).toBe(false);
      expect(toBoolean(undefined)).toBe(false);
      expect(toBoolean('')).toBe(false);
    });
  });

  describe('toNumber', () => {
    it('should convert valid strings to numbers', () => {
      const toNumber = (value: unknown, defaultValue = 0): number => {
        if (typeof value === 'number' && !isNaN(value)) return value;
        if (typeof value === 'string') {
          const num = parseFloat(value);
          return isNaN(num) ? defaultValue : num;
        }
        return defaultValue;
      };

      expect(toNumber('123')).toBe(123);
      expect(toNumber('123.45')).toBe(123.45);
      expect(toNumber('-123')).toBe(-123);
      expect(toNumber('0')).toBe(0);
      expect(toNumber(456)).toBe(456);
    });

    it('should return default for invalid values', () => {
      const toNumber = (value: unknown, defaultValue = 0): number => {
        if (typeof value === 'number' && !isNaN(value)) return value;
        if (typeof value === 'string') {
          const num = parseFloat(value);
          return isNaN(num) ? defaultValue : num;
        }
        return defaultValue;
      };

      expect(toNumber('invalid')).toBe(0);
      expect(toNumber('invalid', -1)).toBe(-1);
      expect(toNumber(null)).toBe(0);
      expect(toNumber(undefined)).toBe(0);
      expect(toNumber(NaN)).toBe(0);
      expect(toNumber({})).toBe(0);
    });
  });

  describe('toString', () => {
    it('should convert values to strings', () => {
      const toString = (value: unknown, defaultValue = ''): string => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'string') return value;
        if (typeof value === 'object') {
          try {
            return JSON.stringify(value);
          } catch {
            return defaultValue;
          }
        }
        return String(value);
      };

      expect(toString('hello')).toBe('hello');
      expect(toString(123)).toBe('123');
      expect(toString(true)).toBe('true');
      expect(toString(false)).toBe('false');
      expect(toString({ key: 'value' })).toBe('{"key":"value"}');
      expect(toString([1, 2, 3])).toBe('[1,2,3]');
    });

    it('should handle null and undefined', () => {
      const toString = (value: unknown, defaultValue = ''): string => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'string') return value;
        if (typeof value === 'object') {
          try {
            return JSON.stringify(value);
          } catch {
            return defaultValue;
          }
        }
        return String(value);
      };

      expect(toString(null)).toBe('');
      expect(toString(null, 'default')).toBe('default');
      expect(toString(undefined)).toBe('');
      expect(toString(undefined, 'default')).toBe('default');
    });
  });

  describe('toArray', () => {
    it('should convert values to arrays', () => {
      const toArray = <T>(value: T | T[]): T[] => {
        if (Array.isArray(value)) return value;
        if (value === null || value === undefined) return [];
        return [value];
      };

      expect(toArray([1, 2, 3])).toEqual([1, 2, 3]);
      expect(toArray('hello')).toEqual(['hello']);
      expect(toArray(123)).toEqual([123]);
      expect(toArray(null)).toEqual([]);
      expect(toArray(undefined)).toEqual([]);
    });

    it('should handle nested arrays', () => {
      const toArray = <T>(value: T | T[]): T[] => {
        if (Array.isArray(value)) return value;
        if (value === null || value === undefined) return [];
        return [value];
      };

      const nested = [[1, 2], [3, 4]];
      expect(toArray(nested)).toEqual(nested);
    });
  });

  describe('toDate', () => {
    it('should convert valid date strings to Date objects', () => {
      const toDate = (value: unknown): Date | null => {
        if (value instanceof Date) return value;
        if (typeof value === 'string' || typeof value === 'number') {
          const date = new Date(value);
          return isNaN(date.getTime()) ? null : date;
        }
        return null;
      };

      const dateStr = '2024-01-01';
      const result = toDate(dateStr);
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString().startsWith('2024-01-01')).toBe(true);

      const timestamp = 1704067200000; // 2024-01-01 00:00:00 UTC
      const timestampResult = toDate(timestamp);
      expect(timestampResult).toBeInstanceOf(Date);
    });

    it('should return null for invalid dates', () => {
      const toDate = (value: unknown): Date | null => {
        if (value instanceof Date) return value;
        if (typeof value === 'string' || typeof value === 'number') {
          const date = new Date(value);
          return isNaN(date.getTime()) ? null : date;
        }
        return null;
      };

      expect(toDate('invalid')).toBeNull();
      expect(toDate(null)).toBeNull();
      expect(toDate(undefined)).toBeNull();
      expect(toDate({})).toBeNull();
    });
  });

  describe('toInteger', () => {
    it('should convert to integer', () => {
      const toInteger = (value: unknown, defaultValue = 0): number => {
        const num = typeof value === 'number' ? value : parseFloat(String(value));
        if (isNaN(num)) return defaultValue;
        return Math.round(num);
      };

      expect(toInteger(123.45)).toBe(123);
      expect(toInteger(123.99)).toBe(124);
      expect(toInteger('456.7')).toBe(457);
      expect(toInteger('100')).toBe(100);
      expect(toInteger('invalid')).toBe(0);
      expect(toInteger('invalid', -1)).toBe(-1);
    });
  });

  describe('toRecord', () => {
    it('should convert to Record<string, string>', () => {
      const toRecord = (value: unknown): Record<string, string> => {
        if (!value || typeof value !== 'object') return {};
        
        const result: Record<string, string> = {};
        for (const [key, val] of Object.entries(value)) {
          if (typeof val === 'string') {
            result[key] = val;
          } else if (val !== null && val !== undefined) {
            result[key] = String(val);
          }
        }
        return result;
      };

      expect(toRecord({ a: 'hello', b: 'world' })).toEqual({ a: 'hello', b: 'world' });
      expect(toRecord({ a: 123, b: true })).toEqual({ a: '123', b: 'true' });
      expect(toRecord(null)).toEqual({});
      expect(toRecord(undefined)).toEqual({});
      expect(toRecord('string')).toEqual({});
    });
  });

  describe('toMultilingual', () => {
    it('should convert to multilingual object', () => {
      const toMultilingual = (value: unknown): Record<string, string> => {
        if (!value) return { en: '' };
        
        if (typeof value === 'string') {
          // Check if it's JSON
          if (value.startsWith('{')) {
            try {
              const parsed = JSON.parse(value);
              if (typeof parsed === 'object') return parsed;
            } catch {
              // Not valid JSON, treat as string
            }
          }
          return { en: value };
        }
        
        if (typeof value === 'object' && !Array.isArray(value)) {
          return value as Record<string, string>;
        }
        
        return { en: String(value) };
      };

      expect(toMultilingual('Hello')).toEqual({ en: 'Hello' });
      expect(toMultilingual({ en: 'Hello', zh: '你好' })).toEqual({ en: 'Hello', zh: '你好' });
      expect(toMultilingual('{"en":"Test","fr":"Teste"}')).toEqual({ en: 'Test', fr: 'Teste' });
      expect(toMultilingual(null)).toEqual({ en: '' });
      expect(toMultilingual(123)).toEqual({ en: '123' });
    });
  });

  describe('parseJSON', () => {
    it('should safely parse JSON', () => {
      const parseJSON = <T>(value: string, defaultValue: T): T => {
        try {
          return JSON.parse(value) as T;
        } catch {
          return defaultValue;
        }
      };

      expect(parseJSON('{"key":"value"}', {})).toEqual({ key: 'value' });
      expect(parseJSON('[1,2,3]', [])).toEqual([1, 2, 3]);
      expect(parseJSON('invalid', null)).toBeNull();
      expect(parseJSON('invalid', { default: true })).toEqual({ default: true });
    });
  });

  describe('clamp', () => {
    it('should clamp values within range', () => {
      const clamp = (value: number, min: number, max: number): number => {
        return Math.min(Math.max(value, min), max);
      };

      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });
});