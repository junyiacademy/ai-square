'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { PBLJourneySummary, ScenarioProgram } from '@/types/pbl';

export default function PBLHistoryV2Page() {
  const { t } = useTranslation(['pbl']);
  const params = useParams();
  const router = useRouter();
  const scenarioId = params.id as string;

  const [scenario, setScenario] = useState<ScenarioProgram | null>(null);
  const [journeys, setJourneys] = useState<PBLJourneySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJourney, setSelectedJourney] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load scenario
        const scenarioResponse = await fetch(`/api/pbl/scenarios/${scenarioId}`);
        const scenarioData = await scenarioResponse.json();
        if (scenarioData.success) {
          setScenario(scenarioData.data);
        }
        
        // Load journeys
        const journeysResponse = await fetch(`/api/pbl/journeys?scenarioId=${scenarioId}`);
        const journeysData = await journeysResponse.json();
        if (journeysData.success) {
          setJourneys(journeysData.data.journeys);
        }
        
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [scenarioId]);

  const handleDeleteJourney = async (journeyId: string) => {
    if (!confirm('確定要刪除這個學習旅程嗎？此操作無法復原。')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/pbl/journeys/${journeyId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setJourneys(prev => prev.filter(j => j.journeyId !== journeyId));
      }
    } catch (error) {
      console.error('Error deleting journey:', error);
    }
  };

  const handleStartNewJourney = () => {
    router.push(`/pbl/scenarios/${scenarioId}/learn-v2`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW');
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}小時${minutes % 60}分鐘`;
    }
    return `${minutes}分鐘`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">載入學習歷史中...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/pbl')}
                className="text-blue-600 hover:text-blue-700"
              >
                ← 返回場景列表
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  學習歷史
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {scenario?.title}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleStartNewJourney}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                       flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              開始新的學習旅程
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {journeys.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              還沒有學習記錄
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              開始您的第一個學習旅程吧！
            </p>
            <button
              onClick={handleStartNewJourney}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                       transition-colors"
            >
              開始學習
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {journeys.map((journey) => (
              <div
                key={journey.journeyId}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md 
                         transition-shadow border border-gray-200 dark:border-gray-700"
              >
                <div className="p-6">
                  {/* Journey Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          journey.status === 'completed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {journey.status === 'completed' ? '已完成' : '進行中'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(journey.startedAt)}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        學習旅程 #{journey.journeyId.split('_')[1]?.slice(-6)}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => router.push(`/pbl/scenarios/${scenarioId}/learn-v2`)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                        title="繼續學習"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteJourney(journey.journeyId)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                        title="刪除旅程"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">進度</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {journey.progress.completedTasks}/{journey.progress.totalTasks}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${journey.progress.percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {journey.scores.overallScore || '--'}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">平均分數</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatDuration(journey.timeSpent)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">學習時間</div>
                    </div>
                  </div>

                  {/* Task Scores */}
                  {journey.scores.taskScores.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        任務分數
                      </h4>
                      <div className="space-y-1">
                        {journey.scores.taskScores.slice(0, 3).map((taskScore, index) => (
                          <div key={taskScore.taskId} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400 truncate">
                              任務 {index + 1}
                            </span>
                            <span className={`font-medium ${
                              taskScore.score ? (
                                taskScore.score >= 80 ? 'text-green-600' :
                                taskScore.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                              ) : 'text-gray-400'
                            }`}>
                              {taskScore.score || '--'}
                            </span>
                          </div>
                        ))}
                        {journey.scores.taskScores.length > 3 && (
                          <div className="text-xs text-gray-400 text-center pt-1">
                            +{journey.scores.taskScores.length - 3} 個任務
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Completion Info */}
                  {journey.completedAt && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        完成於 {formatDate(journey.completedAt)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}