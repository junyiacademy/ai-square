/**
 * 簡單的錯誤記錄器（MVP 版本）
 * 提供基本的錯誤追蹤功能
 */

interface ErrorContext {
  componentStack?: string;
  type?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  reason?: unknown;
  [key: string]: unknown;
}

interface ErrorLog {
  message: string
  stack?: string
  timestamp: string
  url: string
  userAgent: string
  context?: ErrorContext
}

class ErrorLogger {
  private logs: ErrorLog[] = []
  private maxLogs = 50 // 最多保存 50 條錯誤

  /**
   * 記錄錯誤
   */
  log(error: Error, context?: ErrorContext) {
    const errorLog: ErrorLog = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      context
    }

    // 開發環境輸出到 console
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Error:', error)
      if (context) console.error('📋 Context:', context)
    }

    // 加入錯誤列表
    this.logs.unshift(errorLog)
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // 儲存到 localStorage（開發用）
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('error_logs', JSON.stringify(this.logs))
      } catch {
        // localStorage 可能已滿，忽略
      }
    }
  }

  /**
   * 取得所有錯誤記錄
   */
  getLogs(): ErrorLog[] {
    return this.logs
  }

  /**
   * 清除錯誤記錄
   */
  clear() {
    this.logs = []
    if (typeof window !== 'undefined') {
      localStorage.removeItem('error_logs')
    }
  }

  /**
   * 從 localStorage 載入錯誤記錄
   */
  loadFromStorage() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('error_logs')
        if (stored) {
          this.logs = JSON.parse(stored)
        }
      } catch {
        // 忽略解析錯誤
      }
    }
  }
}

// 單例
export const errorLogger = new ErrorLogger()

// 便利函數
export function logError(error: Error | string, context?: ErrorContext) {
  const err = typeof error === 'string' ? new Error(error) : error
  errorLogger.log(err, context)
}

// React Error Boundary 輔助函數
interface ReactErrorInfo {
  componentStack: string;
}

export function logComponentError(error: Error, errorInfo: ReactErrorInfo) {
  logError(error, {
    componentStack: errorInfo.componentStack,
    type: 'React Component Error'
  })
}

// 全域錯誤處理
if (typeof window !== 'undefined') {
  // 載入已存的錯誤
  errorLogger.loadFromStorage()

  // 捕獲未處理的錯誤
  window.addEventListener('error', (event) => {
    logError(new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      type: 'Unhandled Error'
    })
  })

  // 捕獲未處理的 Promise rejection
  window.addEventListener('unhandledrejection', (event) => {
    logError(new Error(`Unhandled Promise: ${event.reason}`), {
      type: 'Unhandled Promise Rejection',
      reason: event.reason
    })
  })
}