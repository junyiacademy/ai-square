import { BaseAIService } from '../base-ai-service';

describe('BaseAIService', () => {
  it('should be defined', () => {
    expect(BaseAIService).toBeDefined();
  });
  
  it('should be an abstract class', () => {
    // BaseAIService is abstract and cannot be instantiated directly
    expect(() => {
      // @ts-expect-error - Testing abstract class
      new BaseAIService();
    }).toThrow();
  });
});