/**
 * Centralized D3.js Mock
 * Used by all test files that need D3 mocking
 */

export const createD3Mock = () => ({
  select: jest.fn(() => ({
    append: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnThis(),
    enter: jest.fn().mockReturnThis(),
    exit: jest.fn().mockReturnThis(),
    remove: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
  })),
  scaleLinear: jest.fn(() => {
    const scale = (value: unknown) => value;
    scale.domain = jest.fn().mockReturnThis();
    scale.range = jest.fn().mockReturnThis();
    return scale;
  }),
  scaleOrdinal: jest.fn(() => {
    const scale = (value: unknown) => value;
    scale.domain = jest.fn().mockReturnThis();
    scale.range = jest.fn().mockReturnThis();
    return scale;
  }),
  arc: jest.fn(() => {
    const arcFn = jest.fn();
    // Fix: Add properties as functions that return this
    Object.assign(arcFn, {
      innerRadius: jest.fn().mockReturnThis(),
      outerRadius: jest.fn().mockReturnThis(),
    });
    return arcFn;
  }),
  pie: jest.fn(() => {
    const pieFn = jest.fn((data: unknown[]) =>
      data.map((d: unknown, i: number) => ({ data: d, index: i })),
    );
    // Fix: Add value property as a function
    Object.assign(pieFn, {
      value: jest.fn().mockReturnThis(),
    });
    return pieFn;
  }),
});

export const setupD3Mock = () => {
  jest.mock("d3", () => createD3Mock());
};
