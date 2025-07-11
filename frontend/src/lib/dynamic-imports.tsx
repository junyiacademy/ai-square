/**
 * 動態導入配置
 * 用於減少初始 bundle 大小
 */

import dynamic from 'next/dynamic'
import React from 'react'

// Domain Radar Chart - 動態載入整個組件
export const DynamicDomainRadarChart = dynamic(
  () => import('@/components/assessment/DomainRadarChart'),
  { 
    ssr: false,
    loading: () => <div className="h-64 flex items-center justify-center">載入圖表中...</div>
  }
)

// DynamicLegend - 已移除 (類型問題)

// D3.js 元件 - 延遲載入
// 暫時註釋 - 組件尚未實作
// export const DynamicKnowledgeGraph = dynamic(
//   () => import('@/components/assessment/KnowledgeGraph').then(mod => ({ default: mod.KnowledgeGraph })),
//   { 
//     ssr: false,
//     loading: () => <div className="h-96 flex items-center justify-center">載入知識圖譜中...</div>
//   }
// )

// export const DynamicCompetencyKnowledgeGraph = dynamic(
//   () => import('@/components/assessment/CompetencyKnowledgeGraph'),
//   { 
//     ssr: false,
//     loading: () => <div className="h-96 flex items-center justify-center">載入能力圖譜中...</div>
//   }
// )

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

// 效能報告元件 - 暫時註釋，等 UI 組件實作完成
// export const DynamicPerformanceReport = dynamic(
//   () => import('@/components/dev/performance-report').then(mod => ({ default: mod.PerformanceReport })),
//   { 
//     ssr: false,
//     loading: () => null
//   }
// )

// 大型 Assessment 組件 - 動態載入
export const DynamicAssessmentResults = dynamic(
  () => import('@/components/assessment/AssessmentResults'),
  { 
    loading: () => <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
  }
)

// PBL 相關大型組件 - 動態載入
export const DynamicPBLScenarioView = dynamic(
  () => import('@/app/pbl/scenarios/[id]/page').then(mod => ({ default: mod.default })),
  { 
    loading: () => <div className="animate-pulse space-y-6">
      <div className="h-12 bg-gray-200 rounded w-2/3"></div>
      <div className="h-96 bg-gray-200 rounded"></div>
    </div>
  }
)

// Sentry 錯誤追蹤 - 已移除