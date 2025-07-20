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
        services: [], // externalServices not available in getStatus()
        thresholds: monitoringStatus.alertThresholds
      },
      cache: {
        redis: (cacheStats as unknown as { redisConnected?: boolean })?.redisConnected || false,
        local: cacheStats.localCacheSize,
        revalidations: cacheStats.activeRevalidations
      },
      performance: {
        totalEndpoints: perfReport.length,
        averageResponseTime: perfReport.length > 0 ? 
          perfReport.reduce((sum, m) => sum + m.averageResponseTime, 0) / perfReport.length : 0,
        cacheHitRate: perfReport.length > 0 ?
          perfReport.reduce((sum, m) => sum + m.cacheHitRate, 0) / perfReport.length : 0,
        errorRate: perfReport.length > 0 ?
          perfReport.reduce((sum, m) => sum + m.errorRate, 0) / perfReport.length : 0
      },
      health: 'healthy'
    };

    // Add detailed information if requested
    if (detailed) {
      return NextResponse.json({
        ...basicStatus,
        detailed: {
          endpoints: perfReport,
          alerts: [], // alerts not available in perfReport
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