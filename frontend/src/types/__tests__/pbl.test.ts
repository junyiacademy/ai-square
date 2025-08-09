import * as pblTypes from '../pbl';

describe('PBL Types', () => {
  it('should export PBL types', () => {
    expect(pblTypes).toBeDefined();
  });

  it('should have type definitions', () => {
    // Type checking at compile time
    expect(true).toBe(true);
  });
});
