/**
 * Tests for monitoring status route
 * Following TDD approach
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { cacheService } from '@/lib/cache/cache-service';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/cache/cache-service');

// Mock console
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('/api/monitoring/status', () => {
  const mockUserRepo = {
    count: jest.fn(),
  };

  const mockProgramRepo = {
    count: jest.fn(),
  };

  const mockScenarioRepo = {
    count: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup repository factory mocks
    (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
    
    // TODO: getStats method doesn't exist on CacheService
    // (cacheService.getStats as jest.Mock).mockResolvedValue({
    //   keys: ['key1', 'key2', 'key3'],
    //   hitRate: 0.85,
    // });
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  it('should return system status successfully', async () => {
    // Mock repository counts
    mockUserRepo.count.mockResolvedValue(100);
    mockProgramRepo.count.mockResolvedValue(250);
    mockScenarioRepo.count.mockResolvedValue(15);

    const request = new NextRequest('http://localhost/api/monitoring/status');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('services');
    
    // Check database status
    expect(data.services.database).toMatchObject({
      status: 'connected',
      counts: {
        users: 100,
        programs: 250,
        scenarios: 15,
      },
    });

    // Check cache status
    expect(data.services.cache).toMatchObject({
      status: 'active',
      keyCount: 3,
      hitRate: 0.85,
    });

    // Check API status
    expect(data.services.api).toMatchObject({
      status: 'running',
      version: expect.any(String),
    });
  });

  it('should handle database connection failure', async () => {
    const dbError = new Error('Connection refused');
    mockUserRepo.count.mockRejectedValue(dbError);

    const request = new NextRequest('http://localhost/api/monitoring/status');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('degraded');
    expect(data.services.database).toMatchObject({
      status: 'error',
      error: 'Connection refused',
    });
  });

  it('should handle cache service failure', async () => {
    // TODO: getStats method doesn't exist on CacheService
    // (cacheService.getStats as jest.Mock).mockRejectedValue(new Error('Redis unavailable'));
    
    mockUserRepo.count.mockResolvedValue(100);
    mockProgramRepo.count.mockResolvedValue(250);
    mockScenarioRepo.count.mockResolvedValue(15);

    const request = new NextRequest('http://localhost/api/monitoring/status');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('degraded');
    expect(data.services.cache).toMatchObject({
      status: 'error',
      error: 'Redis unavailable',
    });
  });

  it('should handle missing repository methods', async () => {
    (mockUserRepo as Partial<typeof mockUserRepo>).count = undefined;
    (mockProgramRepo as Partial<typeof mockProgramRepo>).count = undefined;
    (mockScenarioRepo as Partial<typeof mockScenarioRepo>).count = undefined;

    const request = new NextRequest('http://localhost/api/monitoring/status');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('degraded');
    expect(data.services.database).toMatchObject({
      status: 'error',
      error: expect.stringContaining('count method not available'),
    });
  });

  it('should include optional metadata when requested', async () => {
    mockUserRepo.count.mockResolvedValue(100);
    mockProgramRepo.count.mockResolvedValue(250);
    mockScenarioRepo.count.mockResolvedValue(15);

    const request = new NextRequest('http://localhost/api/monitoring/status?verbose=true');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('metadata');
    expect(data.metadata).toHaveProperty('nodeVersion');
    expect(data.metadata).toHaveProperty('uptime');
    expect(data.metadata).toHaveProperty('memory');
  });

  it('should handle all services failing', async () => {
    const dbError = new Error('Database error');
    const cacheError = new Error('Cache error');
    
    mockUserRepo.count.mockRejectedValue(dbError);
    // TODO: getStats method doesn't exist on CacheService
    // (cacheService.getStats as jest.Mock).mockRejectedValue(cacheError);

    const request = new NextRequest('http://localhost/api/monitoring/status');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('unhealthy');
    expect(data.services.database.status).toBe('error');
    expect(data.services.cache.status).toBe('error');
  });
});

/**
 * Monitoring Status API Considerations:
 * 
 * 1. Health Checks:
 *    - Database connectivity
 *    - Cache availability
 *    - API responsiveness
 * 
 * 2. Status Levels:
 *    - healthy: All services operational
 *    - degraded: Some services failing
 *    - unhealthy: Critical services down
 * 
 * 3. Metadata:
 *    - System information
 *    - Resource usage
 *    - Version details
 * 
 * 4. Error Handling:
 *    - Graceful degradation
 *    - Always return 200 status
 *    - Include error details
 */