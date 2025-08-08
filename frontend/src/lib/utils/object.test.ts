// Object utility functions
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const output = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (isObject(source[key]) && isObject(target[key])) {
        output[key] = deepMerge(target[key], source[key] as any);
      } else {
        output[key] = source[key] as any;
      }
    }
  }
  
  return output;
}

export function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
}

export function isEmpty(obj: any): boolean {
  if (!obj) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

export function getNestedValue(obj: any, path: string, defaultValue?: any): any {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result === undefined ? defaultValue : result;
}

export function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let current = obj;
  
  for (const key of keys) {
    if (!(key in current) || !isObject(current[key])) {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[lastKey] = value;
}

// Tests
describe('Object Utils', () => {
  describe('deepClone', () => {
    it('should deep clone objects', () => {
      const original = {
        a: 1,
        b: { c: 2, d: { e: 3 } },
        f: [1, 2, { g: 4 }]
      };
      
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
      expect(cloned.f).not.toBe(original.f);
    });

    it('should handle dates', () => {
      const date = new Date('2024-01-01');
      const cloned = deepClone({ date });
      
      expect(cloned.date).toEqual(date);
      expect(cloned.date).not.toBe(date);
    });

    it('should handle primitives', () => {
      expect(deepClone(5)).toBe(5);
      expect(deepClone('hello')).toBe('hello');
      expect(deepClone(null)).toBe(null);
    });
  });

  describe('deepMerge', () => {
    it('should deep merge objects', () => {
      const target = { a: 1, b: { c: 2 } };
      const source = { b: { c: 2, d: 3 }, e: 4 };
      
      const merged = deepMerge(target, source as any);
      
      expect(merged).toEqual({
        a: 1,
        b: { c: 2, d: 3 },
        e: 4
      });
    });

    it('should overwrite primitives', () => {
      const target = { a: 1, b: 2 };
      const source = { a: 3 };
      
      expect(deepMerge(target, source)).toEqual({ a: 3, b: 2 });
    });
  });

  describe('isObject', () => {
    it('should identify objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1 })).toBe(true);
    });

    it('should reject non-objects', () => {
      expect(isObject([])).toBe(false);
      expect(isObject(null)).toBe(false);
      expect(isObject(5)).toBe(false);
      expect(isObject('string')).toBe(false);
    });
  });

  describe('pick', () => {
    it('should pick specified keys', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    });

    it('should ignore non-existent keys', () => {
      const obj = { a: 1, b: 2 };
      expect(pick(obj, ['a', 'c' as any])).toEqual({ a: 1 });
    });
  });

  describe('omit', () => {
    it('should omit specified keys', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      expect(omit(obj, ['b', 'd'])).toEqual({ a: 1, c: 3 });
    });

    it('should handle non-existent keys', () => {
      const obj = { a: 1, b: 2 };
      expect(omit(obj, ['c' as any])).toEqual({ a: 1, b: 2 });
    });
  });

  describe('isEmpty', () => {
    it('should identify empty values', () => {
      expect(isEmpty({})).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty('')).toBe(true);
    });

    it('should identify non-empty values', () => {
      expect(isEmpty({ a: 1 })).toBe(false);
      expect(isEmpty([1])).toBe(false);
      expect(isEmpty('hello')).toBe(false);
    });
  });

  describe('getNestedValue', () => {
    it('should get nested values', () => {
      const obj = { a: { b: { c: 123 } } };
      
      expect(getNestedValue(obj, 'a.b.c')).toBe(123);
      expect(getNestedValue(obj, 'a.b')).toEqual({ c: 123 });
    });

    it('should return default for missing paths', () => {
      const obj = { a: { b: 1 } };
      
      expect(getNestedValue(obj, 'a.c', 'default')).toBe('default');
      expect(getNestedValue(obj, 'x.y.z', 42)).toBe(42);
    });
  });

  describe('setNestedValue', () => {
    it('should set nested values', () => {
      const obj: any = {};
      
      setNestedValue(obj, 'a.b.c', 123);
      expect(obj).toEqual({ a: { b: { c: 123 } } });
      
      setNestedValue(obj, 'a.d', 456);
      expect(obj).toEqual({ a: { b: { c: 123 }, d: 456 } });
    });

    it('should overwrite existing values', () => {
      const obj = { a: { b: 1 } };
      
      setNestedValue(obj, 'a.b', 2);
      expect(obj).toEqual({ a: { b: 2 } });
    });
  });
});