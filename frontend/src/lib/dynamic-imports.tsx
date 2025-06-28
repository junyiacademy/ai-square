/**
 * 動態導入配置
 * 用於減少初始 bundle 大小
 */

import dynamic from 'next/dynamic'
import React from 'react'

// 圖表元件 - 延遲載入
export const DynamicRadarChart = dynamic(
  () => import('recharts').then(mod => mod.RadarChart),
  { 
    ssr: false,
    loading: () => <div className="h-64 flex items-center justify-center">載入圖表中...</div>
  }
)

export const DynamicPolarGrid = dynamic(
  () => import('recharts').then(mod => mod.PolarGrid),
  { ssr: false }
)

export const DynamicPolarAngleAxis = dynamic(
  () => import('recharts').then(mod => mod.PolarAngleAxis),
  { ssr: false }
)

export const DynamicPolarRadiusAxis = dynamic(
  () => import('recharts').then(mod => mod.PolarRadiusAxis),
  { ssr: false }
)

export const DynamicRadar = dynamic(
  () => import('recharts').then(mod => mod.Radar),
  { ssr: false }
)

export const DynamicResponsiveContainer = dynamic(
  () => import('recharts').then(mod => mod.ResponsiveContainer),
  { ssr: false }
)

export const DynamicLegend = dynamic(
  () => import('recharts').then(mod => mod.Legend),
  { ssr: false }
)

// D3.js 元件 - 延遲載入
export const DynamicKnowledgeGraph = dynamic(
  () => import('@/components/assessment/KnowledgeGraph').then(mod => ({ default: mod.KnowledgeGraph })),
  { 
    ssr: false,
    loading: () => <div className="h-96 flex items-center justify-center">載入知識圖譜中...</div>
  }
)

export const DynamicCompetencyKnowledgeGraph = dynamic(
  () => import('@/components/assessment/CompetencyKnowledgeGraph'),
  { 
    ssr: false,
    loading: () => <div className="h-96 flex items-center justify-center">載入能力圖譜中...</div>
  }
)

// Monaco Editor - 延遲載入
export const DynamicMonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  { 
    ssr: false,
    loading: () => <div className="h-96 flex items-center justify-center">載入編輯器中...</div>
  }
)

// React Markdown - 延遲載入
export const DynamicMarkdown = dynamic(
  () => import('react-markdown'),
  { 
    loading: () => <div className="animate-pulse h-4 bg-gray-200 rounded"></div>
  }
)

// Chart.js 元件 - 延遲載入
export const DynamicChart = dynamic(
  () => import('react-chartjs-2').then(mod => mod.Chart),
  { 
    ssr: false,
    loading: () => <div className="h-64 flex items-center justify-center">載入圖表中...</div>
  }
)

// 效能報告元件 - 只在開發環境載入
export const DynamicPerformanceReport = dynamic(
  () => import('@/components/dev/performance-report').then(mod => ({ default: mod.PerformanceReport })),
  { 
    ssr: false,
    loading: () => null
  }
)