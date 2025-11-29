'use client';

import React, { useState, useEffect } from 'react'
import { Sparkles, CheckCircle, Trophy, RefreshCw, ArrowLeft, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import DiscoveryPageLayout from '@/components/discovery/DiscoveryPageLayout';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import { authenticatedFetch } from '@/lib/utils/authenticated-fetch';
import { TaskInteractionHistory } from '@/components/discovery/task/TaskInteractionHistory';
import { TaskSubmitSection } from '@/components/discovery/task/TaskSubmitSection';

interface TaskData {
  id: string;
  title: string;
  type: 'question' | 'chat' | 'creation' | 'analysis';
  status: 'pending' | 'active' | 'completed';
  content: {
    instructions?: string;
    description?: string;
    xp?: number;
    objectives?: string[];
    completionCriteria?: string[];
    difficulty?: string;
    hints?: string[];
    taskId?: string;
    skillsImproved?: string[];
    scenarioId?: string;
  };
  interactions: Array<{
    timestamp: string;
    type: string;
    content: Record<string, unknown>;
  }>;
  startedAt: string;
  completedAt?: string;
  evaluation?: {
    id: string;
    score: number;
    feedback: string;
    feedbackVersions?: Record<string, string>;
    evaluatedAt: string;
  };
}

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { i18n } = useTranslation();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [taskData, setTaskData] = useState<TaskData | null>(null);
  const [userResponse, setUserResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [feedback, setFeedback] = useState<{
    completed: boolean;
    feedback: string;
    xpEarned: number;
    strengths: string[];
    improvements: string[];
  } | null>(null);
  const [showHistory, setShowHistory] = useState(true);
  const [completingTask, setCompletingTask] = useState(false);
  const [regeneratingEvaluation, setRegeneratingEvaluation] = useState(false);

  const scenarioId = params.id as string;
  const programId = params.programId as string;
  const taskId = params.taskId as string;

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (authLoading) {
      return;
    }

    if (!isLoggedIn) {
      router.push('/login?redirect=/discovery/scenarios');
      return;
    }

    const fetchTaskData = async () => {
      try {
        const currentLanguage = i18n.language || 'en';
        const res = await authenticatedFetch(`/api/discovery/scenarios/${scenarioId}/programs/${programId}/tasks/${taskId}?lang=${currentLanguage}`, {
          credentials: 'include',
          headers: {
            'x-session-token': localStorage.getItem('ai_square_session') || ''
          }
        });

        if (!res.ok) {
          throw new Error('Failed to fetch task data');
        }

        const data = await res.json();
        setTaskData(data);

        // If task is pending, start it
        if (data.status === 'pending') {
          await authenticatedFetch(`/api/discovery/scenarios/${scenarioId}/programs/${programId}/tasks/${taskId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'x-session-token': localStorage.getItem('ai_square_session') || ''
            },
            body: JSON.stringify({
              action: 'start'
            })
          });

          // Update local state
          setTaskData(prev => prev ? { ...prev, status: 'active' } : null);
        }
      } catch (error) {
        console.error('Error fetching task:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTaskData();
  }, [taskId, programId, scenarioId, isLoggedIn, authLoading, router, i18n.language]);

  const handleSubmit = async () => {
    if (!userResponse.trim()) return;

    setSubmitting(true);
    const startTime = Date.now();

    try {
      const res = await authenticatedFetch(`/api/discovery/scenarios/${scenarioId}/programs/${programId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('ai_square_session') || '',
          'Accept-Language': i18n.language || 'zhTW'
        },
        body: JSON.stringify({
          action: 'submit',
          content: {
            response: userResponse,
            timeSpent: Math.floor((Date.now() - startTime) / 1000) // Time in seconds
          }
        })
      });

      if (!res.ok) {
        throw new Error('Failed to submit task');
      }

      const result = await res.json();

      // Clear previous feedback before setting new one
      setFeedback(null);

      // Store feedback in state to show in UI with a small delay for better UX
      setTimeout(() => {
        setFeedback({
          completed: result.completed,
          feedback: result.feedback,
          xpEarned: result.xpEarned,
          strengths: result.strengths || [],
          improvements: result.improvements || []
        });
      }, 100);

      // Clear the input for next attempt
      setUserResponse('');

      // Reload task data to get updated interactions
      const updatedTaskRes = await authenticatedFetch(`/api/discovery/scenarios/${scenarioId}/programs/${programId}/tasks/${taskId}`, {
        credentials: 'include',
        headers: {
          'x-session-token': localStorage.getItem('ai_square_session') || ''
        }
      });

      if (updatedTaskRes.ok) {
        const updatedTaskData = await updatedTaskRes.json();
        setTaskData(updatedTaskData);
      }

      // Don't auto-navigate when task is completed
      // Let user decide when to complete the task
    } catch (error) {
      console.error('Error submitting task:', error);
      // You could show an error toast here
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteTask = async () => {
    setCompletingTask(true);
    try {
      const res = await authenticatedFetch(`/api/discovery/scenarios/${scenarioId}/programs/${programId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('ai_square_session') || ''
        },
        body: JSON.stringify({
          action: 'confirm-complete'
        })
      });

      if (!res.ok) {
        throw new Error('Failed to complete task');
      }

      const result = await res.json();

      // Successfully completed - show comprehensive evaluation
      if (result.success && result.evaluation) {
        // Update task data with comprehensive evaluation
        setTaskData({
          ...taskData!,
          status: 'completed',
          evaluation: result.evaluation
        });

        // Scroll to evaluation section after a short delay
        setTimeout(() => {
          const evaluationElement = document.getElementById('comprehensive-evaluation');
          if (evaluationElement) {
            evaluationElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add highlight effect
            evaluationElement.classList.add('highlight-evaluation');
            setTimeout(() => {
              evaluationElement.classList.remove('highlight-evaluation');
            }, 3000);
          }
        }, 500);
      } else {
        throw new Error(result.error || 'Failed to complete task');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      alert('任務完成失敗，請稍後再試');
    } finally {
      setCompletingTask(false);
    }
  };

  const handleRegenerateEvaluation = async () => {
    setRegeneratingEvaluation(true);
    try {
      const res = await authenticatedFetch(`/api/discovery/scenarios/${scenarioId}/programs/${programId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('ai_square_session') || '',
          'Accept-Language': i18n.language || 'zhTW'
        },
        body: JSON.stringify({
          action: 'regenerate-evaluation'
        })
      });

      if (!res.ok) {
        throw new Error('Failed to regenerate evaluation');
      }

      const result = await res.json();

      // Update task data with new evaluation
      if (result.evaluation && taskData) {
        setTaskData({
          ...taskData,
          evaluation: {
            id: result.evaluation.id,
            score: result.evaluation.score,
            feedback: result.evaluation.feedback || result.evaluation.feedbackText,
            evaluatedAt: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error('Error regenerating evaluation:', error);
    } finally {
      setRegeneratingEvaluation(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DiscoveryPageLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
            <span>載入中...</span>
          </div>
        </div>
      </DiscoveryPageLayout>
    );
  }

  if (!taskData) {
    return (
      <DiscoveryPageLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500">找不到此任務</p>
          <button
            onClick={() => router.push(`/discovery/scenarios/${scenarioId}/programs/${programId}`)}
            className="mt-4 text-purple-600 hover:text-purple-700"
          >
            返回學習歷程
          </button>
        </div>
      </DiscoveryPageLayout>
    );
  }

  // Check if task has any passed interactions and calculate pass statistics
  const passedInteractions = taskData.interactions.filter(
    i => i.type === 'ai_response' && (i.content as Record<string, unknown>)?.completed === true
  );
  const hasPassedBefore = passedInteractions.length > 0;
  const passCount = passedInteractions.length;
  const bestScore = hasPassedBefore ? Math.max(...passedInteractions.map(i => (i.content as Record<string, unknown>)?.xpEarned as number || 0)) : 0;
  const latestPassScore = hasPassedBefore ? (passedInteractions[passedInteractions.length - 1]?.content as Record<string, unknown>)?.xpEarned as number || 0 : 0;

  return (
    <DiscoveryPageLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/discovery/scenarios/${scenarioId}/programs/${programId}`)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回學習歷程</span>
        </button>

        {/* Task Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {taskData.title}
              </h1>
              <p className="text-lg text-gray-600">
                {taskData.content.description || taskData.content.instructions || ''}
              </p>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-medium">{taskData.content.xp || 0} XP</span>
            </div>
          </div>

          {/* Instructions/Objectives */}
          {taskData.content.objectives && taskData.content.objectives.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                任務指引
              </h3>
              <ul className="space-y-2">
                {taskData.content.objectives.map((objective, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Completion Criteria */}
          {taskData.content.completionCriteria && taskData.content.completionCriteria.length > 0 && (
            <div className="bg-purple-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-purple-600" />
                <span>完成標準</span>
              </h3>
              <ul className="space-y-2">
                {taskData.content.completionCriteria.map((criteria, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span className="text-gray-700">{criteria}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Response Section - Only show if task is not completed */}
        {taskData.status !== 'completed' && (
          <TaskSubmitSection
            userResponse={userResponse}
            onUserResponseChange={setUserResponse}
            onSubmit={handleSubmit}
            submitting={submitting}
            showHints={showHints}
            onToggleHints={() => setShowHints(!showHints)}
            hints={taskData.content.hints || []}
            feedback={feedback}
            hasPassedBefore={hasPassedBefore}
            passCount={passCount}
            interactionCount={taskData.interactions?.length || 0}
          />
        )}

        {/* Completed Task Summary */}
        {taskData.status === 'completed' && (
          <div className="space-y-6 mb-6">
            {/* Achievement Header */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-green-900 mb-1">
                    任務已完成！
                  </h3>
                  <p className="text-green-700">
                    恭喜您成功完成這個任務，繼續您的學習之旅。
                  </p>
                </div>
              </div>

              {/* Learning Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/70 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-800">{taskData.interactions.filter(i => i.type === 'user_input').length}</div>
                  <div className="text-sm text-green-600">嘗試次數</div>
                </div>
                <div className="bg-white/70 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-800">{passCount}</div>
                  <div className="text-sm text-green-600">通過次數</div>
                </div>
                <div className="bg-white/70 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-800">{bestScore}</div>
                  <div className="text-sm text-green-600">最高分數 (XP)</div>
                </div>
                <div className="bg-white/70 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-800">{Math.round((passCount / taskData.interactions.filter(i => i.type === 'user_input').length) * 100)}%</div>
                  <div className="text-sm text-green-600">成功率</div>
                </div>
              </div>
            </div>

            {/* Skills Gained */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span>技能成長</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  // Collect all skills from AI responses
                  const allSkills = new Set<string>();
                  taskData.interactions
                    .filter(i => i.type === 'ai_response' && (i.content as Record<string, unknown>)?.skillsImproved)
                    .forEach(i => {
                      const skills = (i.content as Record<string, unknown>)?.skillsImproved as string[];
                      skills?.forEach((skill: string) => allSkills.add(skill));
                    });

                  const skillsArray = Array.from(allSkills);

                  // If no skills found, show default message
                  if (skillsArray.length === 0) {
                    return (
                      <p className="text-gray-500 text-sm">完成任務時將顯示獲得的技能</p>
                    );
                  }

                  return skillsArray.map((skill, index) => (
                    <span key={index} className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                      {skill}
                    </span>
                  ));
                })()}
              </div>
            </div>

            {/* Final Evaluation */}
            <div id="comprehensive-evaluation" className="bg-white rounded-2xl shadow-lg p-6 transition-all duration-500">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                  <span>綜合評價</span>
                </h4>
                {/* Refresh button - only show in localhost */}
                {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                  <button
                    onClick={handleRegenerateEvaluation}
                    disabled={regeneratingEvaluation}
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                    title="重新生成評價 (僅限開發環境)"
                  >
                    <RefreshCw className={`w-4 h-4 ${regeneratingEvaluation ? 'animate-spin' : ''}`} />
                    <span>{regeneratingEvaluation ? '生成中...' : '重新生成'}</span>
                  </button>
                )}
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none prose-headings:text-gray-900 prose-strong:text-gray-900 prose-p:text-gray-700 prose-ul:text-gray-700 prose-ol:text-gray-700">
                  <ReactMarkdown>
                    {taskData.evaluation?.feedback || `經過 ${taskData.interactions.filter(i => i.type === 'user_input').length} 次嘗試，你成功完成了這個任務！`}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => router.push(`/discovery/scenarios/${scenarioId}/programs/${programId}`)}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>返回學習歷程</span>
              </button>
            </div>
          </div>
        )}

        {/* Interaction History Section */}
        {taskData.interactions && taskData.interactions.length > 0 && (
          <TaskInteractionHistory
            interactions={taskData.interactions}
            showHistory={showHistory}
            onToggleHistory={() => setShowHistory(!showHistory)}
            passCount={passCount}
          />
        )}

        {/* Task Passed Success Banner - Only show for active tasks */}
        {hasPassedBefore && taskData.status === 'active' && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-900 mb-1">
                    {
                      passCount > 1
                        ? `任務已通過 ${passCount} 次！`
                        : '恭喜達到通過標準！'
                    }
                  </h3>

                  {/* Pass Statistics */}
                  {passCount > 1 && (
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="flex items-center space-x-1 text-sm">
                        <Trophy className="w-4 h-4 text-yellow-600" />
                        <span className="text-green-800">最高分：{bestScore} XP</span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span className="text-green-800">最新分數：{latestPassScore} XP</span>
                      </div>
                    </div>
                  )}

                  <p className="text-green-700 mb-3">
                    {
                      passCount > 1
                        ? '您已經多次通過！可以隨時完成任務，或繼續挑戰更高分數。'
                        : '您可以隨時完成此任務，或繼續改進您的答案以獲得更好的學習成果。'
                    }
                  </p>
                  <button
                    onClick={handleCompleteTask}
                    disabled={completingTask}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    {completingTask ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>處理中...</span>
                      </>
                    ) : (
                      <>
                        <Trophy className="w-5 h-5" />
                        <span>完成任務 →</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* AI Assistant Section */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-3">
            <MessageCircle className="w-6 h-6 text-purple-600" />
            <h4 className="text-lg font-semibold text-gray-900">
              AI 學習助手
            </h4>
          </div>
          <p className="text-gray-700 mb-4">
            需要更多協助嗎？AI 學習助手可以回答你的問題，提供個人化的學習建議。
          </p>
          <button className="text-purple-600 hover:text-purple-700 font-medium">
            開啟 AI 對話 →
          </button>
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </DiscoveryPageLayout>
  );
}
