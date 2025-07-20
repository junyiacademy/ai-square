/**
 * Production-ready performance monitoring
 * Core monitoring functionality without external dependencies
 */

import { performanceMonitor } from './performance-monitor';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';

interface MonitoringConfig {
  alertThresholds: {
    responseTime: number; // ms
    errorRate: number; // percentage
    cacheHitRate: number; // percentage
  };
}

class ProductionMonitor {
  private config: MonitoringConfig;
  private isEnabled: boolean;
  private alertCooldown = new Map<string, number>();
  private readonly COOLDOWN_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.config = this.loadConfig();
    this.isEnabled = process.env.NODE_ENV === 'production';
    
    if (this.isEnabled) {
      this.startPeriodicReporting();
    }
  }

  private loadConfig(): MonitoringConfig {
    return {
      alertThresholds: {
        responseTime: parseInt(process.env.ALERT_RESPONSE_TIME || '5000'),
        errorRate: parseInt(process.env.ALERT_ERROR_RATE || '5'),
        cacheHitRate: parseInt(process.env.ALERT_CACHE_HIT_RATE || '50')
      }
    };
  }


  private startPeriodicReporting(): void {
    // Report metrics every 1 minute
    setInterval(() => {
      this.reportMetrics();
    }, 60 * 1000);

    // Check for alerts every 30 seconds
    setInterval(() => {
      this.checkAlerts();
    }, 30 * 1000);
  }

  private async reportMetrics(): Promise<void> {
    try {
      const metrics = performanceMonitor.getAllMetrics();
      const cacheStats = await distributedCacheService.getStats();

      // Calculate summary
      const summary = {
        averageResponseTime: metrics.length > 0 
          ? metrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / metrics.length 
          : 0,
        averageCacheHitRate: metrics.length > 0 
          ? metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / metrics.length 
          : 0,
        averageErrorRate: metrics.length > 0 
          ? metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length 
          : 0
      };

      // Log metrics locally
      console.log('Performance Metrics:', {
        timestamp: new Date().toISOString(),
        averageResponseTime: summary.averageResponseTime,
        averageCacheHitRate: summary.averageCacheHitRate,
        averageErrorRate: summary.averageErrorRate,
        cacheStats
      });

    } catch (error) {
      console.error('Failed to report metrics:', error);
    }
  }


  private async checkAlerts(): Promise<void> {
    const metrics = performanceMonitor.getAllMetrics();
    const cacheStats = await distributedCacheService.getStats();

    // Calculate summary
    const summary = {
      averageResponseTime: metrics.length > 0 
        ? metrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / metrics.length 
        : 0,
      averageErrorRate: metrics.length > 0 
        ? metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length 
        : 0
    };

    // Check response time alerts
    if (summary.averageResponseTime > this.config.alertThresholds.responseTime) {
      this.sendAlert('high_response_time', {
        current: summary.averageResponseTime,
        threshold: this.config.alertThresholds.responseTime
      });
    }

    // Check error rate alerts
    if (summary.averageErrorRate > this.config.alertThresholds.errorRate) {
      this.sendAlert('high_error_rate', {
        current: summary.averageErrorRate,
        threshold: this.config.alertThresholds.errorRate
      });
    }

    // Check cache hit rate alerts
    if (report.summary.averageCacheHitRate < this.config.alertThresholds.cacheHitRate) {
      this.sendAlert('low_cache_hit_rate', {
        current: report.summary.averageCacheHitRate,
        threshold: this.config.alertThresholds.cacheHitRate
      });
    }

    // Check Redis connectivity
    if (!cacheStats.redisStats?.redisConnected) {
      this.sendAlert('redis_disconnected', {
        fallbackCacheSize: cacheStats.localCacheSize
      });
    }
  }

  private sendAlert(type: string, data: Record<string, unknown>): void {
    const now = Date.now();
    const lastAlert = this.alertCooldown.get(type);
    
    // Skip if in cooldown period
    if (lastAlert && now - lastAlert < this.COOLDOWN_DURATION) {
      return;
    }

    console.error(`🚨 ALERT: ${type}`, data);
    this.alertCooldown.set(type, now);

    // Send to webhook if configured
    if (process.env.ALERT_WEBHOOK_URL) {
      this.sendWebhookAlert(type, data);
    }
  }

  private async sendWebhookAlert(type: string, data: Record<string, unknown>): Promise<void> {
    try {
      await fetch(process.env.ALERT_WEBHOOK_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          alert_type: type,
          data,
          timestamp: new Date().toISOString(),
          service: 'ai-square-frontend'
        })
      });
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  /**
   * Get current monitoring status
   */
  getStatus(): {
    enabled: boolean;
    alertThresholds: typeof this.config.alertThresholds;
    lastReported: Date;
  } {
    return {
      enabled: this.isEnabled,
      alertThresholds: this.config.alertThresholds,
      lastReported: new Date()
    };
  }
}

// Export singleton instance
export const productionMonitor = new ProductionMonitor();
export default productionMonitor;