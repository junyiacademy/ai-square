'use client';

import React, { useState, useEffect } from 'react';
import { getErrorTracker, ErrorReport, ErrorMetrics } from '@/lib/error-tracking/error-tracker';

const ErrorDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<ErrorMetrics | null>(null);
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [selectedError, setSelectedError] = useState<ErrorReport | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const errorTracker = getErrorTracker();
    
    const updateData = () => {
      setMetrics(errorTracker.getMetrics());
      setErrors(errorTracker.getAllErrors());
    };

    updateData();
    const interval = setInterval(updateData, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const clearAllErrors = () => {
    const errorTracker = getErrorTracker();
    errorTracker.clearErrors();
    setMetrics(errorTracker.getMetrics());
    setErrors([]);
    setSelectedError(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-800 bg-red-100';
      case 'high': return 'text-red-700 bg-red-50';
      case 'medium': return 'text-yellow-700 bg-yellow-50';
      case 'low': return 'text-blue-700 bg-blue-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Only show in development or when explicitly enabled
  if (process.env.NODE_ENV !== 'development' && !isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 p-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-colors"
        title="顯示錯誤監控"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">錯誤監控儀表板</h2>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Left Panel - Metrics and Error List */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
            {/* Metrics */}
            {metrics && (
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium mb-3">統計資訊</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-2xl font-bold text-gray-900">{metrics.totalErrors}</div>
                    <div className="text-sm text-gray-600">總錯誤數</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded">
                    <div className="text-2xl font-bold text-red-600">
                      {metrics.errorsBySeverity.critical || 0}
                    </div>
                    <div className="text-sm text-red-600">嚴重錯誤</div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">依嚴重程度</h4>
                  <div className="space-y-1">
                    {Object.entries(metrics.errorsBySeverity).map(([severity, count]) => (
                      <div key={severity} className="flex justify-between items-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(severity)}`}>
                          {severity}
                        </span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">依組件</h4>
                  <div className="space-y-1">
                    {Object.entries(metrics.errorsByType).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{type}</span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={clearAllErrors}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  清除所有錯誤
                </button>
              </div>
            )}

            {/* Error List */}
            <div className="p-4">
              <h3 className="text-lg font-medium mb-3">錯誤列表</h3>
              {errors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  沒有錯誤記錄
                </div>
              ) : (
                <div className="space-y-2">
                  {errors.map((error) => (
                    <div
                      key={error.id}
                      onClick={() => setSelectedError(error)}
                      className={`p-3 border rounded cursor-pointer transition-colors ${
                        selectedError?.id === error.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(error.severity)}`}>
                          {error.severity}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(error.timestamp)}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 truncate mb-1">
                        {error.message}
                      </div>
                      <div className="text-xs text-gray-600">
                        {error.context.component} • {error.context.action}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Error Details */}
          <div className="w-1/2 overflow-y-auto">
            {selectedError ? (
              <div className="p-4">
                <h3 className="text-lg font-medium mb-3">錯誤詳細信息</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">錯誤訊息</label>
                    <div className="p-3 bg-gray-50 rounded text-sm">{selectedError.message}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">嚴重程度</label>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getSeverityColor(selectedError.severity)}`}>
                      {selectedError.severity}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">時間</label>
                    <div className="text-sm text-gray-600">{formatTimestamp(selectedError.timestamp)}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">指紋</label>
                    <div className="text-sm text-gray-600 font-mono">{selectedError.fingerprint}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">上下文</label>
                    <div className="p-3 bg-gray-50 rounded">
                      <pre className="text-xs whitespace-pre-wrap">
                        {JSON.stringify(selectedError.context, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {selectedError.stack && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">堆疊追蹤</label>
                      <div className="p-3 bg-gray-50 rounded font-mono text-xs whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {selectedError.stack}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 h-full flex items-center justify-center text-gray-500">
                選擇一個錯誤以查看詳細信息
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorDashboard;