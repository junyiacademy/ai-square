/**
 * 效能監控工具
 * 追蹤和報告應用程式效能指標
 */

interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: number
}

interface ResourceTiming {
  name: string
  duration: number
  size?: number
  cached: boolean
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private readonly MAX_METRICS = 1000

  /**
   * 記錄效能指標
   */
  recordMetric(name: string, value: number, unit: string = 'ms') {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now()
    }

    this.metrics.push(metric)
    
    // 防止記憶體洩漏
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS)
    }

    // 在開發環境記錄到 console
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${value}${unit}`)
    }
  }

  /**
   * 測量函式執行時間
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now()
    try {
      const result = await fn()
      const duration = performance.now() - start
      this.recordMetric(name, duration)
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.recordMetric(`${name}_error`, duration)
      throw error
    }
  }

  /**
   * 測量同步函式執行時間
   */
  measure<T>(name: string, fn: () => T): T {
    const start = performance.now()
    try {
      const result = fn()
      const duration = performance.now() - start
      this.recordMetric(name, duration)
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.recordMetric(`${name}_error`, duration)
      throw error
    }
  }

  /**
   * 取得 Core Web Vitals
   */
  getCoreWebVitals() {
    if (typeof window === 'undefined') return null

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const paint = performance.getEntriesByType('paint')

    const fcp = paint.find(entry => entry.name === 'first-contentful-paint')
    const lcp = performance.getEntriesByType('largest-contentful-paint').slice(-1)[0]

    return {
      // First Contentful Paint
      FCP: fcp?.startTime || 0,
      // Largest Contentful Paint
      LCP: lcp?.startTime || 0,
      // Time to Interactive
      TTI: navigation?.loadEventEnd - navigation?.fetchStart || 0,
      // Total Blocking Time (簡化版)
      TBT: navigation?.loadEventEnd - navigation?.domInteractive || 0
    }
  }

  /**
   * 取得資源載入統計
   */
  getResourceTimings(): ResourceTiming[] {
    if (typeof window === 'undefined') return []

    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    
    return entries.map(entry => ({
      name: entry.name,
      duration: entry.duration,
      size: entry.transferSize,
      cached: entry.transferSize === 0 && entry.decodedBodySize > 0
    }))
  }

  /**
   * 取得快取命中率
   */
  getCacheHitRate(): number {
    const resources = this.getResourceTimings()
    if (resources.length === 0) return 0

    const cached = resources.filter(r => r.cached).length
    return (cached / resources.length) * 100
  }

  /**
   * 取得平均指標
   */
  getAverageMetric(name: string): number | null {
    const relevantMetrics = this.metrics.filter(m => m.name === name)
    if (relevantMetrics.length === 0) return null

    const sum = relevantMetrics.reduce((acc, m) => acc + m.value, 0)
    return sum / relevantMetrics.length
  }

  /**
   * 取得效能摘要
   */
  getSummary() {
    const vitals = this.getCoreWebVitals()
    const cacheHitRate = this.getCacheHitRate()
    
    return {
      coreWebVitals: vitals,
      cacheHitRate: `${cacheHitRate.toFixed(1)}%`,
      averageApiCall: this.getAverageMetric('api_call'),
      totalMetrics: this.metrics.length,
      recentMetrics: this.metrics.slice(-10)
    }
  }

  /**
   * 清除所有指標
   */
  clear() {
    this.metrics = []
  }
}

// 匯出單例
export const performanceMonitor = new PerformanceMonitor()

// 方便的裝飾器函式（用於 class methods）
export function measurePerformance(name?: string) {
  return function <T>(
    target: T,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const targetConstructor = (target as { constructor: { name: string } }).constructor
    const metricName = name || `${targetConstructor.name}.${propertyKey}`

    descriptor.value = async function (this: T, ...args: unknown[]) {
      return performanceMonitor.measureAsync(metricName, () =>
        originalMethod.apply(this, args)
      )
    }

    return descriptor
  }
}