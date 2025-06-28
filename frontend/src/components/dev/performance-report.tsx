'use client'

import React, { useState, useEffect } from 'react'
import { performanceMonitor } from '@/lib/performance/performance-monitor'
import { cacheService } from '@/lib/cache/cache-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Activity, Database, Zap } from 'lucide-react'

/**
 * 開發環境效能報告元件
 * 只在開發環境顯示
 */
export function PerformanceReport() {
  const [summary, setSummary] = useState<any>(null)
  const [cacheStats, setCacheStats] = useState<any>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refresh = () => {
    setIsRefreshing(true)
    setSummary(performanceMonitor.getSummary())
    setCacheStats((cacheService as any).getCacheStats?.() || {})
    setTimeout(() => setIsRefreshing(false), 500)
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 5000) // 每 5 秒更新
    return () => clearInterval(interval)
  }, [])

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  if (!summary) return null

  const { coreWebVitals, cacheHitRate, averageApiCall, recentMetrics } = summary

  // 效能評分
  const getScoreColor = (value: number, goodThreshold: number, needsImprovementThreshold: number) => {
    if (value <= goodThreshold) return 'text-green-600'
    if (value <= needsImprovementThreshold) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 z-50">
      <Card className="shadow-lg border-2 border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance Monitor
            </CardTitle>
            <button
              onClick={refresh}
              className={`p-1 rounded hover:bg-gray-100 ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Core Web Vitals */}
          {coreWebVitals && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-600 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Core Web Vitals
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span>FCP:</span>
                  <span className={getScoreColor(coreWebVitals.FCP, 1800, 3000)}>
                    {coreWebVitals.FCP.toFixed(0)}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>LCP:</span>
                  <span className={getScoreColor(coreWebVitals.LCP, 2500, 4000)}>
                    {coreWebVitals.LCP.toFixed(0)}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>TTI:</span>
                  <span className={getScoreColor(coreWebVitals.TTI, 3800, 7300)}>
                    {coreWebVitals.TTI.toFixed(0)}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>TBT:</span>
                  <span className={getScoreColor(coreWebVitals.TBT, 200, 600)}>
                    {coreWebVitals.TBT.toFixed(0)}ms
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Cache Stats */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <Database className="h-3 w-3" />
              Cache Performance
            </h4>
            <div className="flex items-center justify-between text-xs">
              <span>Hit Rate:</span>
              <Badge variant="secondary" className="text-xs">
                {cacheHitRate}
              </Badge>
            </div>
            {cacheStats && (
              <div className="flex items-center justify-between text-xs">
                <span>LocalStorage:</span>
                <span className="text-gray-600">
                  {cacheStats.localStorageSize?.toFixed(1) || 0} KB
                </span>
              </div>
            )}
          </div>

          {/* API Performance */}
          {averageApiCall && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-600">API Performance</h4>
              <div className="flex items-center justify-between text-xs">
                <span>Avg Response:</span>
                <span className={getScoreColor(averageApiCall, 200, 500)}>
                  {averageApiCall.toFixed(0)}ms
                </span>
              </div>
            </div>
          )}

          {/* Recent Metrics */}
          {recentMetrics && recentMetrics.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-gray-600">Recent Activities</h4>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {recentMetrics.slice(-5).reverse().map((metric: any, idx: number) => (
                  <div key={idx} className="text-xs flex justify-between text-gray-600">
                    <span className="truncate max-w-[200px]">{metric.name}</span>
                    <span>{metric.value.toFixed(0)}{metric.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}