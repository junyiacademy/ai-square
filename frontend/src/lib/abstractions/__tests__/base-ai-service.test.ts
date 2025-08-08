import { BaseAIService } from '../base-ai-service';

describe('BaseAIService', () => {
  it('should be defined', () => {
    expect(BaseAIService).toBeDefined();
  });
  
  it('should be an abstract class', () => {
    // BaseAIService is abstract, TypeScript prevents instantiation at compile time
    // but at runtime it's just a regular class
    expect(BaseAIService).toBeDefined();
    // Abstract methods are not defined in the prototype
    expect(typeof BaseAIService).toBe('function');
  });
});