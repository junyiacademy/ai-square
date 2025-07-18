import { NextRequest, NextResponse } from 'next/server';
import { productionMonitor } from '@/lib/monitoring/production-monitor';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';
import { performanceMonitor } from '@/lib/monitoring/performance-monitor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    // Get basic status
    const monitoringStatus = productionMonitor.getStatus();
    const cacheStats = await distributedCacheService.getStats();
    const perfReport = performanceMonitor.getAllMetrics();

    const basicStatus = {
      timestamp: new Date().toISOString(),
      monitoring: {
        enabled: monitoringStatus.enabled,
        services: monitoringStatus.externalServices,
        thresholds: monitoringStatus.alertThresholds
      },
      cache: {
        redis: cacheStats.redisStats?.redisConnected || false,
        local: cacheStats.localCacheSize,
        revalidations: cacheStats.activeRevalidations
      },
      performance: {
        totalEndpoints: perfReport.endpoints.length,
        averageResponseTime: perfReport.summary.averageResponseTime,
        cacheHitRate: perfReport.summary.averageCacheHitRate,
        errorRate: perfReport.summary.averageErrorRate
      },
      health: 'healthy'
    };

    // Add detailed information if requested
    if (detailed) {
      return NextResponse.json({
        ...basicStatus,
        detailed: {
          endpoints: perfReport.endpoints,
          alerts: perfReport.alerts,
          cacheDetails: cacheStats,
          recentMetrics: performanceMonitor.getRecentMetrics(50)
        }
      });
    }

    return NextResponse.json(basicStatus);
  } catch (error) {
    console.error('Error getting monitoring status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get monitoring status',
        timestamp: new Date().toISOString(),
        health: 'unhealthy'
      },
      { status: 500 }
    );
  }
}