/**
 * Demo test file with TypeScript errors to verify protection mechanism
 */

import { describe, it, expect } from '@jest/globals';

describe('TypeScript Error Demo', () => {
  it('should demonstrate TypeScript error protection', () => {
    // ❌ 這裡故意加入 TypeScript 錯誤來測試防護機制
    const badVariable: string = 123;  // Type 'number' is not assignable to type 'string'
    const anotherBad: number = "hello"; // Type 'string' is not assignable to type 'number'
    
    // ❌ 使用 any 類型（被禁止）
    const forbidden: any = "this should not be allowed";
    
    // ❌ 介面屬性不匹配
    interface TestInterface {
      id: string;
      name: string;
    }
    
    const badObject: TestInterface = {
      id: 123, // Type 'number' is not assignable to type 'string'
      wrongProperty: "test" // Object literal may only specify known properties
    };

    expect(badVariable).toBe("123");
    expect(anotherBad).toBe(123);
    expect(forbidden).toBe("this should not be allowed");
    expect(badObject.id).toBe("123");
  });
});