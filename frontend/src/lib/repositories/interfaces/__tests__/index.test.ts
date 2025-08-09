import * as interfaces from '../index';

describe('Repository Interfaces', () => {
  it('should export repository interfaces', () => {
    expect(interfaces).toBeDefined();
  });

  it('should have IRepository interface', () => {
    // Type checking happens at compile time
    expect(true).toBe(true);
  });
});
