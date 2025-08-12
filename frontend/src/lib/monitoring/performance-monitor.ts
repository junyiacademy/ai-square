/**
 * Performance monitoring system for API endpoints
 * Tracks response times, cache hit rates, and error rates
 */

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  cacheHit: boolean;
  statusCode: number;
  timestamp: string;
  userId?: string;
  errorMessage?: string;
}

interface AggregatedMetrics {
  endpoint: string;
  method: string;
  totalRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  lastUpdated: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private aggregated: Map<string, AggregatedMetrics> = new Map();
  private readonly maxMetricsSize = 10000; // Keep last 10k metrics
  private readonly aggregationInterval = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Start periodic aggregation only in non-test environments
    if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
      setInterval(() => this.aggregateMetrics(), this.aggregationInterval);
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // Trim metrics if too many
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }
  }

  /**
   * Get aggregated metrics for an endpoint
   */
  getMetrics(endpoint: string, method: string = 'GET'): AggregatedMetrics | null {
    const key = `${method}:${endpoint}`;
    return this.aggregated.get(key) || null;
  }

  /**
   * Get all aggregated metrics
   */
  getAllMetrics(): AggregatedMetrics[] {
    return Array.from(this.aggregated.values());
  }

  /**
   * Get recent metrics for debugging
   */
  getRecentMetrics(limit: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
    this.aggregated.clear();
  }

  /**
   * Aggregate metrics periodically
   */
  private aggregateMetrics() {
    const now = new Date().toISOString();
    const fiveMinutesAgo = Date.now() - this.aggregationInterval;
    
    // Get recent metrics
    const recentMetrics = this.metrics.filter(m => 
      new Date(m.timestamp).getTime() > fiveMinutesAgo
    );
    
    // Group by endpoint and method
    const groups = new Map<string, PerformanceMetrics[]>();
    
    for (const metric of recentMetrics) {
      const key = `${metric.method}:${metric.endpoint}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(metric);
    }
    
    // Calculate aggregated metrics
    for (const [key, metrics] of groups) {
      const [method, endpoint] = key.split(':');
      
      const responseTimes = metrics.map(m => m.responseTime);
      const cacheHits = metrics.filter(m => m.cacheHit).length;
      const errors = metrics.filter(m => m.statusCode >= 400).length;
      
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(responseTimes.length * 0.95);
      
      const aggregated: AggregatedMetrics = {
        endpoint,
        method,
        totalRequests: metrics.length,
        averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        p95ResponseTime: responseTimes[p95Index] || 0,
        cacheHitRate: metrics.length > 0 ? (cacheHits / metrics.length) * 100 : 0,
        errorRate: metrics.length > 0 ? (errors / metrics.length) * 100 : 0,
        lastUpdated: now
      };
      
      this.aggregated.set(key, aggregated);
    }
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Middleware to automatically track performance
 */
export function withPerformanceTracking<T>(
  handler: () => Promise<T>,
  endpoint: string,
  method: string = 'GET',
  userId?: string
): Promise<T> {
  const startTime = Date.now();
  let cacheHit = false;
  let statusCode = 200;
  let errorMessage: string | undefined;

  return handler()
    .then(result => {
      // Check if result came from cache
      if (typeof result === 'object' && result !== null && 'cacheHit' in result) {
        cacheHit = (result as { cacheHit: boolean }).cacheHit;
      }
      
      return result;
    })
    .catch(error => {
      statusCode = 500;
      errorMessage = error.message;
      throw error;
    })
    .finally(() => {
      const responseTime = Date.now() - startTime;
      
      performanceMonitor.recordMetric({
        endpoint,
        method,
        responseTime,
        cacheHit,
        statusCode,
        timestamp: new Date().toISOString(),
        userId,
        errorMessage
      });
    });
}

/**
 * Get performance report
 */
export function getPerformanceReport(): {
  summary: {
    totalEndpoints: number;
    averageResponseTime: number;
    averageCacheHitRate: number;
    averageErrorRate: number;
  };
  endpoints: AggregatedMetrics[];
  alerts: string[];
} {
  const allMetrics = performanceMonitor.getAllMetrics();
  
  const summary = {
    totalEndpoints: allMetrics.length,
    averageResponseTime: allMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / allMetrics.length || 0,
    averageCacheHitRate: allMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / allMetrics.length || 0,
    averageErrorRate: allMetrics.reduce((sum, m) => sum + m.errorRate, 0) / allMetrics.length || 0
  };
  
  const alerts: string[] = [];
  
  // Generate alerts for problematic endpoints
  for (const metric of allMetrics) {
    if (metric.averageResponseTime > 5000) {
      alerts.push(`⚠️ ${metric.endpoint} (${metric.method}) - Slow response time: ${metric.averageResponseTime.toFixed(0)}ms`);
    }
    if (metric.errorRate > 5) {
      alerts.push(`🚨 ${metric.endpoint} (${metric.method}) - High error rate: ${metric.errorRate.toFixed(1)}%`);
    }
    if (metric.cacheHitRate < 50 && metric.method === 'GET') {
      alerts.push(`📊 ${metric.endpoint} (${metric.method}) - Low cache hit rate: ${metric.cacheHitRate.toFixed(1)}%`);
    }
  }
  
  return {
    summary,
    endpoints: allMetrics.sort((a, b) => b.averageResponseTime - a.averageResponseTime),
    alerts
  };
}