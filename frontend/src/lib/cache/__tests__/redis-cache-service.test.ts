import { redisCacheService } from '../redis-cache-service';

describe('redisCacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(redisCacheService).toBeDefined();
  });
  
  it('should have required methods', () => {
    expect(typeof redisCacheService.get).toBe('function');
    expect(typeof redisCacheService.set).toBe('function');
    expect(typeof redisCacheService.delete).toBe('function');
    expect(typeof redisCacheService.clear).toBe('function');
  });
  
  it('should handle get operations', async () => {
    const result = await redisCacheService.get('test-key');
    expect(result === null || typeof result === 'string').toBe(true);
  });
});