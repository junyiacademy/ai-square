'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

interface ReviewSession {
  id: string;
  scenarioTitle: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  duration: number;
  progress: {
    percentage: number;
    completedStages: number;
    totalStages: number;
  };
  stageResults: Array<{
    stageId: string;
    stageName: string;
    status: string;
    score?: number;
    feedback?: string;
    completedAt?: string;
    timeSpent: number;
  }>;
  conversations: Array<{
    id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: string;
    stageId?: string;
  }>;
  overallScore?: number;
}

export default function SessionReviewPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { t, i18n } = useTranslation(['pbl']);
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const resolvedParams = await params;
        const sessionId = resolvedParams.id;
        
        // In a real implementation, this would fetch from the review API
        // For now, we'll create a mock session for demonstration
        const mockSession: ReviewSession = {
          id: sessionId,
          scenarioTitle: 'AI 輔助求職訓練',
          status: 'completed',
          startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date().toISOString(),
          duration: 7200, // 2 hours
          progress: {
            percentage: 100,
            completedStages: 3,
            totalStages: 3
          },
          stageResults: [
            {
              stageId: 'stage-1',
              stageName: '問題識別',
              status: 'completed',
              score: 85,
              feedback: '很好地識別了求職過程中的主要挑戰',
              completedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
              timeSpent: 1800
            },
            {
              stageId: 'stage-2', 
              stageName: '解決方案規劃',
              status: 'completed',
              score: 92,
              feedback: '提出了創新且實用的 AI 工具應用方案',
              completedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
              timeSpent: 2700
            },
            {
              stageId: 'stage-3',
              stageName: '實施與評估',
              status: 'completed',
              score: 88,
              feedback: '成功實施方案並進行了深入的自我評估',
              completedAt: new Date().toISOString(),
              timeSpent: 2700
            }
          ],
          conversations: [
            {
              id: '1',
              role: 'user',
              content: '我想了解如何使用AI來幫助求職',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              stageId: 'stage-1'
            },
            {
              id: '2',
              role: 'ai',
              content: '很好的開始！讓我們先分析一下求職過程中會遇到的主要挑戰...',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000).toISOString(),
              stageId: 'stage-1'
            }
          ],
          overallScore: 88
        };

        setSession(mockSession);
      } catch (err) {
        setError('Failed to load session review');
        console.error('Error loading session review:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [params]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredConversations = selectedStage 
    ? session?.conversations.filter(conv => conv.stageId === selectedStage) || []
    : session?.conversations || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {error || 'Session not found'}
          </h1>
          <Link
            href="/pbl/history"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← {t('history.title')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link
              href="/pbl/history"
              className="text-blue-600 hover:text-blue-700 font-medium mr-4"
            >
              ← {t('history.title')}
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {session.scenarioTitle}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            學習回顧與成果分析
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Session Overview */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                學習概覽
              </h2>
              
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">狀態：</span>
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    已完成
                  </span>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">開始時間：</span>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatDate(session.startedAt)}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">完成時間：</span>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {session.completedAt && formatDate(session.completedAt)}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">總時長：</span>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatDuration(session.duration)}
                  </p>
                </div>
                
                {session.overallScore && (
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">總分：</span>
                    <p className={`text-2xl font-bold ${getScoreColor(session.overallScore)}`}>
                      {session.overallScore}%
                    </p>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>完成進度</span>
                  <span>{session.progress.completedStages}/{session.progress.totalStages} 階段</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${session.progress.percentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Stage Results */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                階段成績
              </h2>
              
              <div className="space-y-4">
                {session.stageResults.map((stage) => (
                  <div 
                    key={stage.stageId}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedStage === stage.stageId
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedStage(
                      selectedStage === stage.stageId ? null : stage.stageId
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {stage.stageName}
                      </h3>
                      {stage.score && (
                        <span className={`text-lg font-bold ${getScoreColor(stage.score)}`}>
                          {stage.score}%
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      用時：{formatDuration(stage.timeSpent)}
                    </div>
                    
                    {stage.feedback && (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {stage.feedback}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Conversation History */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  學習對話記錄
                </h2>
                {selectedStage && (
                  <button
                    onClick={() => setSelectedStage(null)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    顯示全部對話
                  </button>
                )}
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    {selectedStage ? '此階段沒有對話記錄' : '沒有對話記錄'}
                  </p>
                ) : (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`flex ${
                        conversation.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          conversation.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        <p className="text-sm">{conversation.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {formatDate(conversation.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}