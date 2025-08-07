/**
 * Tests for d3.ts
 */

import '../d3';

describe('d3 mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should mock d3 module', () => {
    // D3 is mocked via jest.mock in the d3.ts file
    expect(jest.isMockFunction(require('d3').select)).toBe(true);
  });

  it('should provide chainable API', () => {
    const d3 = require('d3');
    const selection = d3.select('body');
    
    expect(selection.append).toBeDefined();
    expect(selection.attr).toBeDefined();
    expect(selection.style).toBeDefined();
  });
});