/**
 * Tests for /api/scenarios/index/rebuild route
 * Priority: CRITICAL - 0% coverage → 100% coverage
 */

import { POST } from '../route';
import { scenarioIndexBuilder } from '@/lib/services/scenario-index-builder';

// Mock the scenario index builder
jest.mock('@/lib/services/scenario-index-builder', () => ({
  scenarioIndexBuilder: {
    buildFullIndex: jest.fn(),
    getStatus: jest.fn()
  }
}));

describe('/api/scenarios/index/rebuild', () => {
  const mockScenarioIndexBuilder = scenarioIndexBuilder as jest.Mocked<typeof scenarioIndexBuilder>;
  let consoleLog: jest.SpyInstance;
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods
    consoleLog = jest.spyOn(console, 'log').mockImplementation();
    consoleError = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLog.mockRestore();
    consoleError.mockRestore();
  });

  describe('POST /api/scenarios/index/rebuild', () => {
    it('should rebuild index successfully', async () => {
      const mockStatus = {
        lastBuild: '2023-01-01T12:00:00.000Z',
        totalScenarios: 10,
        isBuilding: false,
        errors: []
      };

      mockScenarioIndexBuilder.buildFullIndex.mockResolvedValue(undefined);
      mockScenarioIndexBuilder.getStatus.mockReturnValue(mockStatus);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        message: 'Scenario index rebuilt successfully',
        status: mockStatus
      });

      expect(mockScenarioIndexBuilder.buildFullIndex).toHaveBeenCalledTimes(1);
      expect(mockScenarioIndexBuilder.getStatus).toHaveBeenCalledTimes(1);
      expect(consoleLog).toHaveBeenCalledWith('[Scenario Index] Rebuilding index...');
    });

    it('should log rebuild start message', async () => {
      mockScenarioIndexBuilder.buildFullIndex.mockResolvedValue(undefined);
      mockScenarioIndexBuilder.getStatus.mockReturnValue({
        lastBuild: '2023-01-01T12:00:00.000Z',
        totalScenarios: 0,
        isBuilding: false,
        errors: []
      });

      await POST();

      expect(consoleLog).toHaveBeenCalledWith('[Scenario Index] Rebuilding index...');
    });

    it('should return status from builder', async () => {
      const customStatus = {
        lastBuild: '2024-06-15T10:30:00.000Z',
        totalScenarios: 25,
        isBuilding: true,
        errors: ['Warning: some scenario missing'],
        buildStarted: '2024-06-15T10:29:00.000Z'
      };

      mockScenarioIndexBuilder.buildFullIndex.mockResolvedValue(undefined);
      mockScenarioIndexBuilder.getStatus.mockReturnValue(customStatus);

      const response = await POST();
      const data = await response.json();

      expect(data.status).toEqual(customStatus);
      expect(data.success).toBe(true);
    });

    it('should handle build errors gracefully', async () => {
      const buildError = new Error('Index build failed');
      mockScenarioIndexBuilder.buildFullIndex.mockRejectedValue(buildError);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Failed to rebuild scenario index',
        details: 'Index build failed'
      });

      expect(consoleError).toHaveBeenCalledWith(
        '[Scenario Index] Error rebuilding index:',
        buildError
      );
      expect(mockScenarioIndexBuilder.getStatus).not.toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', async () => {
      const nonErrorException = 'String error message';
      mockScenarioIndexBuilder.buildFullIndex.mockRejectedValue(nonErrorException);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Failed to rebuild scenario index',
        details: 'Unknown error'
      });

      expect(consoleError).toHaveBeenCalledWith(
        '[Scenario Index] Error rebuilding index:',
        nonErrorException
      );
    });

    it('should handle null/undefined exceptions', async () => {
      mockScenarioIndexBuilder.buildFullIndex.mockRejectedValue(null);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.details).toBe('Unknown error');
    });

    it('should handle object exceptions', async () => {
      const objectError = { message: 'Object error', code: 500 };
      mockScenarioIndexBuilder.buildFullIndex.mockRejectedValue(objectError);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.details).toBe('Unknown error');
    });

    it('should handle Error with custom properties', async () => {
      const customError = new Error('Custom error message');
      (customError as any).code = 'CUSTOM_ERROR';
      (customError as any).statusCode = 422;

      mockScenarioIndexBuilder.buildFullIndex.mockRejectedValue(customError);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.details).toBe('Custom error message');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';

      mockScenarioIndexBuilder.buildFullIndex.mockRejectedValue(timeoutError);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.details).toBe('Request timeout');
    });

    it('should call methods in correct order', async () => {
      const callOrder: string[] = [];

      mockScenarioIndexBuilder.buildFullIndex.mockImplementation(async () => {
        callOrder.push('buildFullIndex');
      });

      mockScenarioIndexBuilder.getStatus.mockImplementation(() => {
        callOrder.push('getStatus');
        return {
          lastBuild: '2023-01-01T12:00:00.000Z',
          totalScenarios: 0,
          isBuilding: false,
          errors: []
        };
      });

      await POST();

      expect(callOrder).toEqual(['buildFullIndex', 'getStatus']);
    });

    it('should not call getStatus if buildFullIndex fails', async () => {
      mockScenarioIndexBuilder.buildFullIndex.mockRejectedValue(new Error('Build failed'));

      await POST();

      expect(mockScenarioIndexBuilder.buildFullIndex).toHaveBeenCalled();
      expect(mockScenarioIndexBuilder.getStatus).not.toHaveBeenCalled();
    });

    it('should return JSON content type', async () => {
      mockScenarioIndexBuilder.buildFullIndex.mockResolvedValue(undefined);
      mockScenarioIndexBuilder.getStatus.mockReturnValue({
        lastBuild: '2023-01-01T12:00:00.000Z',
        totalScenarios: 0,
        isBuilding: false,
        errors: []
      });

      const response = await POST();

      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should handle concurrent requests', async () => {
      // Mock slow build process
      mockScenarioIndexBuilder.buildFullIndex.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 50))
      );
      mockScenarioIndexBuilder.getStatus.mockReturnValue({
        lastBuild: '2023-01-01T12:00:00.000Z',
        totalScenarios: 5,
        isBuilding: false,
        errors: []
      });

      // Make concurrent requests
      const requests = Array.from({ length: 3 }, () => POST());
      const responses = await Promise.all(requests);
      const dataPromises = responses.map(response => response.json());
      const allData = await Promise.all(dataPromises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      allData.forEach(data => {
        expect(data.success).toBe(true);
        expect(data.message).toBe('Scenario index rebuilt successfully');
      });

      // Build should be called 3 times (once per request)
      expect(mockScenarioIndexBuilder.buildFullIndex).toHaveBeenCalledTimes(3);
      expect(mockScenarioIndexBuilder.getStatus).toHaveBeenCalledTimes(3);
    });

    it('should handle empty status gracefully', async () => {
      mockScenarioIndexBuilder.buildFullIndex.mockResolvedValue(undefined);
      mockScenarioIndexBuilder.getStatus.mockReturnValue(null as any);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.status).toBeNull();
    });

    it('should handle undefined status gracefully', async () => {
      mockScenarioIndexBuilder.buildFullIndex.mockResolvedValue(undefined);
      mockScenarioIndexBuilder.getStatus.mockReturnValue(undefined as any);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.status).toBeUndefined();
    });

    it('should handle status with complex data structures', async () => {
      const complexStatus = {
        lastBuild: '2023-01-01T12:00:00.000Z',
        totalScenarios: 15,
        isBuilding: false,
        errors: [
          'Warning: scenario A has invalid format',
          'Error: scenario B missing required field'
        ],
        statistics: {
          pblScenarios: 8,
          assessmentScenarios: 4,
          discoveryScenarios: 3
        },
        metadata: {
          buildVersion: '1.2.3',
          buildDuration: 1500,
          indexSize: '2.5MB'
        }
      };

      mockScenarioIndexBuilder.buildFullIndex.mockResolvedValue(undefined);
      mockScenarioIndexBuilder.getStatus.mockReturnValue(complexStatus);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toEqual(complexStatus);
      expect(data.status.errors).toHaveLength(2);
      expect(data.status.statistics.pblScenarios).toBe(8);
    });

    it('should preserve all status properties', async () => {
      const statusWithManyProps = {
        lastBuild: '2023-01-01T12:00:00.000Z',
        totalScenarios: 10,
        isBuilding: false,
        errors: [],
        warnings: ['Some warnings'],
        buildId: 'build-12345',
        environment: 'production',
        version: '1.0.0'
      };

      mockScenarioIndexBuilder.buildFullIndex.mockResolvedValue(undefined);
      mockScenarioIndexBuilder.getStatus.mockReturnValue(statusWithManyProps);

      const response = await POST();
      const data = await response.json();

      // Verify all properties are preserved
      Object.keys(statusWithManyProps).forEach(key => {
        expect(data.status).toHaveProperty(key);
        expect(data.status[key]).toEqual((statusWithManyProps as any)[key]);
      });
    });

    it('should work with different error types', async () => {
      const errorTypes = [
        new TypeError('Type error'),
        new ReferenceError('Reference error'),
        new RangeError('Range error'),
        new SyntaxError('Syntax error')
      ];

      for (const error of errorTypes) {
        mockScenarioIndexBuilder.buildFullIndex.mockRejectedValueOnce(error);

        const response = await POST();
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.details).toBe(error.message);
      }
    });
  });
});