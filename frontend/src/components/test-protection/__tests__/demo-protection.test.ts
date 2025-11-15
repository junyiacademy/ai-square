/**
 * Demo test file to verify TypeScript error protection mechanism
 */

import { describe, it, expect } from '@jest/globals';

describe('TypeScript Error Protection Demo', () => {
  it('should pass basic test with correct types', () => {
    // ✅ 正確的 TypeScript 代碼
    const message: string = 'Protection mechanism works!';
    const count: number = 42;
    const isActive: boolean = true;

    expect(message).toBe('Protection mechanism works!');
    expect(count).toBe(42);
    expect(isActive).toBe(true);
  });

  it('should demonstrate proper interface usage', () => {
    // ✅ 正確定義介面
    interface TestUser {
      id: string;
      name: string;
      email: string;
    }

    const user: TestUser = {
      id: '12345',
      name: 'Test User',
      email: 'test@example.com'
    };

    expect(user.id).toBe('12345');
    expect(user.name).toBe('Test User');
    expect(user.email).toBe('test@example.com');
  });

  it('should handle arrays with proper typing', () => {
    // ✅ 正確的陣列類型
    const numbers: number[] = [1, 2, 3, 4, 5];
    const strings: string[] = ['a', 'b', 'c'];

    expect(numbers.length).toBe(5);
    expect(strings.length).toBe(3);
    expect(numbers.reduce((sum, n) => sum + n, 0)).toBe(15);
  });

  it('should work with proper function types', () => {
    // ✅ 正確的函數類型
    const add = (a: number, b: number): number => a + b;
    const greet = (name: string): string => `Hello, ${name}!`;

    expect(add(2, 3)).toBe(5);
    expect(greet('World')).toBe('Hello, World!');
  });
});
