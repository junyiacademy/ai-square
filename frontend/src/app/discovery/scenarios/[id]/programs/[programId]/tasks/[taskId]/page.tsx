'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import DiscoveryPageLayout from '@/components/discovery/DiscoveryPageLayout';
import { useAuth } from '@/hooks/useAuth';
import { 
  ArrowLeftIcon,
  SparklesIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  LightBulbIcon,
  TrophyIcon,
  ExclamationCircleIcon,
  ClockIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

interface TaskData {
  id: string;
  title: string;
  type: 'question' | 'chat' | 'creation' | 'analysis';
  status: 'pending' | 'active' | 'completed';
  content: {
    instructions?: string;
    context?: {
      description?: string;
      xp?: number;
      objectives?: string[];
      completionCriteria?: string[];
      difficulty?: string;
      hints?: string[];
    };
  };
  interactions: Array<{
    timestamp: string;
    type: string;
    content: any;
  }>;
  startedAt: string;
  completedAt?: string;
}

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
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
        const res = await fetch(`/api/discovery/scenarios/${scenarioId}/programs/${programId}/tasks/${taskId}`, {
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
          await fetch(`/api/discovery/scenarios/${scenarioId}/programs/${programId}/tasks/${taskId}`, {
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
  }, [taskId, programId, scenarioId, isLoggedIn, authLoading, router]);

  const handleSubmit = async () => {
    if (!userResponse.trim()) return;

    setSubmitting(true);
    const startTime = Date.now();
    
    try {
      const res = await fetch(`/api/discovery/scenarios/${scenarioId}/programs/${programId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('ai_square_session') || ''
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
      
      // Store feedback in state to show in UI
      setFeedback({
        completed: result.completed,
        feedback: result.feedback,
        xpEarned: result.xpEarned,
        strengths: result.strengths || [],
        improvements: result.improvements || []
      });
      
      // Clear the input for next attempt
      setUserResponse('');
      
      // Reload task data to get updated interactions
      const updatedTaskRes = await fetch(`/api/discovery/scenarios/${scenarioId}/programs/${programId}/tasks/${taskId}`, {
        credentials: 'include',
        headers: {
          'x-session-token': localStorage.getItem('ai_square_session') || ''
        }
      });
      
      if (updatedTaskRes.ok) {
        const updatedTaskData = await updatedTaskRes.json();
        setTaskData(updatedTaskData);
      }
      
      // If task is completed, navigate after delay to show feedback
      if (result.completed) {
        setTimeout(() => {
          if (result.nextTaskId) {
            router.push(`/discovery/scenarios/${scenarioId}/programs/${programId}`);
          } else {
            // All tasks completed
            router.push(`/discovery/scenarios/${scenarioId}/programs/${programId}`);
          }
        }, 5000); // Show feedback for 5 seconds
      } else {
        // If not completed, clear feedback after 3 seconds to allow retry
        setTimeout(() => {
          setFeedback(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error submitting task:', error);
      // You could show an error toast here
    } finally {
      setSubmitting(false);
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

  return (
    <DiscoveryPageLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/discovery/scenarios/${scenarioId}/programs/${programId}`)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeftIcon className="w-5 h-5" />
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
                {taskData.content.context?.description || taskData.content.instructions || ''}
              </p>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
              <TrophyIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{taskData.content.context?.xp || 0} XP</span>
            </div>
          </div>

          {/* Instructions/Objectives */}
          {taskData.content.context?.objectives && taskData.content.context.objectives.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                任務指引
              </h3>
              <ul className="space-y-2">
                {taskData.content.context.objectives.map((objective, index) => (
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
          {taskData.content.context?.completionCriteria && taskData.content.context.completionCriteria.length > 0 && (
            <div className="bg-purple-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <CheckCircleIcon className="w-5 h-5 text-purple-600" />
                <span>完成標準</span>
              </h3>
              <ul className="space-y-2">
                {taskData.content.context.completionCriteria.map((criteria, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span className="text-gray-700">{criteria}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Response Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {taskData.interactions && taskData.interactions.length > 0 ? '繼續作答' : '你的回答'}
          </h3>
          
          <textarea
            value={userResponse}
            onChange={(e) => setUserResponse(e.target.value)}
            placeholder={
              taskData.interactions && taskData.interactions.length > 0 
                ? "根據 AI 的回饋，改進你的回答..." 
                : "在這裡寫下你的回答..."
            }
            className="w-full h-48 p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          />
          
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setShowHints(!showHints)}
              className="flex items-center space-x-2 text-purple-600 hover:text-purple-700"
            >
              <LightBulbIcon className="w-5 h-5" />
              <span>{showHints ? '隱藏提示' : '需要提示？'}</span>
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={!userResponse.trim() || submitting || feedback}
              className={`
                flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all
                ${userResponse.trim() && !submitting && !feedback
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>提交中...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  <span>提交答案</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Interaction History Section */}
        {taskData.interactions && taskData.interactions.length > 0 && (
          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <ClockIcon className="w-5 h-5 text-gray-600" />
                <span>學習歷程</span>
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (共 {taskData.interactions.filter(i => i.type === 'user_input').length} 次嘗試)
                </span>
              </h3>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-gray-600 hover:text-gray-800 transition-transform duration-200"
              >
                {showHistory ? (
                  <ChevronUpIcon className="w-5 h-5" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {showHistory && (
              <div className="space-y-4 max-h-96 overflow-y-auto">
              {taskData.interactions.map((interaction, index) => (
                <div key={index} className={`
                  rounded-lg p-4 
                  ${interaction.type === 'user_input' 
                    ? 'bg-white border border-gray-200 ml-0 mr-8' 
                    : interaction.content.completed
                      ? 'bg-green-50/50 border border-green-200 ml-8 mr-0'
                      : 'bg-orange-50/50 border border-orange-200 ml-8 mr-0'}
                `}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {interaction.type === 'user_input' ? (
                        <>
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">你</span>
                          </div>
                          <span className="text-sm font-medium text-gray-700">你的回答</span>
                        </>
                      ) : (
                        <>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            interaction.content.completed 
                              ? 'bg-green-600' 
                              : 'bg-orange-600'
                          }`}>
                            <SparklesIcon className="w-4 h-4 text-white" />
                          </div>
                          <span className={`text-sm font-medium ${
                            interaction.content.completed 
                              ? 'text-green-700' 
                              : 'text-orange-700'
                          }`}>AI 回饋</span>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(interaction.timestamp).toLocaleString('zh-TW')}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-700">
                    {interaction.type === 'user_input' ? (
                      <p className="whitespace-pre-wrap">{interaction.content.response}</p>
                    ) : (
                      <div className="space-y-3">
                        {/* Pass/Fail Status */}
                        <div className="flex items-center space-x-2">
                          {interaction.content.completed ? (
                            <>
                              <CheckCircleIcon className="w-5 h-5 text-green-600" />
                              <span className="text-sm font-medium text-green-700">任務通過</span>
                              {interaction.content.xpEarned > 0 && (
                                <div className="flex items-center space-x-1 text-purple-600 font-medium ml-2">
                                  <TrophyIcon className="w-4 h-4" />
                                  <span>+{interaction.content.xpEarned} XP</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <ExclamationCircleIcon className="w-5 h-5 text-orange-600" />
                              <span className="text-sm font-medium text-orange-700">需要改進</span>
                            </>
                          )}
                        </div>
                        
                        {/* Feedback */}
                        <p className="text-gray-700">{interaction.content.feedback}</p>
                        
                        {/* Strengths */}
                        {interaction.content.strengths && interaction.content.strengths.length > 0 && (
                          <div className="bg-green-50 rounded-md p-3">
                            <p className="text-sm font-medium text-green-800 mb-1">優點：</p>
                            <ul className="text-sm text-green-700 space-y-1">
                              {interaction.content.strengths.map((strength, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Improvements */}
                        {interaction.content.improvements && interaction.content.improvements.length > 0 && (
                          <div className="bg-orange-50 rounded-md p-3">
                            <p className="text-sm font-medium text-orange-800 mb-1">改進建議：</p>
                            <ul className="text-sm text-orange-700 space-y-1">
                              {interaction.content.improvements.map((improvement, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>{improvement}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Skills Improved */}
                        {interaction.content.skillsImproved && interaction.content.skillsImproved.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {interaction.content.skillsImproved.map((skill, idx) => (
                              <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        )}

        {/* Hints Section */}
        {showHints && taskData.content.context?.hints && taskData.content.context.hints.length > 0 && (
          <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200 mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
              <LightBulbIcon className="w-5 h-5 text-yellow-600" />
              <span>提示</span>
            </h4>
            <ul className="space-y-2">
              {taskData.content.context.hints.map((hint, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-yellow-600 mt-1">💡</span>
                  <span className="text-gray-700">{hint}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Feedback Section */}
        {feedback && (
          <div className={`rounded-2xl shadow-lg p-8 mb-6 ${
            feedback.completed ? 'bg-green-50 border-2 border-green-200' : 'bg-orange-50 border-2 border-orange-200'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                {feedback.completed ? (
                  <>
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                    <span>任務完成！</span>
                  </>
                ) : (
                  <>
                    <ExclamationCircleIcon className="w-6 h-6 text-orange-600" />
                    <span>需要改進</span>
                  </>
                )}
              </h3>
              <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-full shadow-sm">
                <TrophyIcon className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-purple-700">+{feedback.xpEarned} XP</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Main Feedback */}
              <div>
                <p className="text-gray-700 leading-relaxed">{feedback.feedback}</p>
              </div>

              {/* Strengths */}
              {feedback.strengths.length > 0 && (
                <div className="bg-green-100 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">優點</h4>
                  <ul className="space-y-1">
                    {feedback.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-green-600">✓</span>
                        <span className="text-green-700">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {feedback.improvements.length > 0 && (
                <div className="bg-orange-100 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-800 mb-2">改進建議</h4>
                  <ul className="space-y-1">
                    {feedback.improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-orange-600">•</span>
                        <span className="text-orange-700">{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {feedback.completed && (
              <div className="mt-6 text-center">
                <p className="text-gray-600 mb-2">即將返回學習歷程...</p>
                <div className="w-32 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden">
                  <div 
                    className="h-full bg-purple-600 rounded-full"
                    style={{
                      animation: 'progress 3s linear forwards'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Assistant Section */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-3">
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-purple-600" />
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