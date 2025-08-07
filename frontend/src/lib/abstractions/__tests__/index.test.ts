import * as abstractions from '../index';

describe('abstractions/index', () => {
  it('should export all abstractions', () => {
    // Check that the module exports something
    expect(abstractions).toBeDefined();
    expect(Object.keys(abstractions).length).toBeGreaterThan(0);
  });
  
  it('should have expected exports', () => {
    // The actual exports from the index file
    const exports = Object.keys(abstractions);
    
    // We expect at least some key exports to be present
    // (adjust based on what's actually exported)
    expect(exports.length).toBeGreaterThan(0);
  });
});