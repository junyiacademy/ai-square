import { createMockRequest, createMockContext } from '../api';

describe('api test helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMockRequest', () => {
    it('should create a mock NextRequest', () => {
      const request = createMockRequest('http://localhost:3000/api/test');
      expect(request).toBeDefined();
      expect(request.url).toBe('http://localhost:3000/api/test');
    });

    it('should handle JSON body', () => {
      const request = createMockRequest('http://localhost:3000/api/test', {
        method: 'POST',
        json: { test: 'data' }
      });
      expect(request.method).toBe('POST');
    });
  });

  describe('createMockContext', () => {
    it('should create a mock API context', () => {
      const context = createMockContext({ id: 'test-id' });
      expect(context).toBeDefined();
      expect(context.params).toBeDefined();
    });
  });
});