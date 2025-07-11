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
  TrophyIcon
} from '@heroicons/react/24/outline';

interface TaskData {
  id: string;
  title: string;
  description: string;
  xp: number;
  status: 'available' | 'in_progress' | 'completed';
  instructions: string[];
  hints: string[];
  completionCriteria: string[];
}

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const { user, isLoggedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [taskData, setTaskData] = useState<TaskData | null>(null);
  const [userResponse, setUserResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const scenarioId = params.id as string;
  const programId = params.programId as string;
  const taskId = params.taskId as string;

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login?redirect=/discovery/scenarios');
      return;
    }

    // Mock task data - in a real implementation, this would come from an API
    setTaskData({
      id: taskId,
      title: '認識你的職業角色',
      description: '在這個任務中，你將深入了解你選擇的職業角色，包括日常工作內容、所需技能和職業發展路徑。',
      xp: 100,
      status: 'in_progress',
      instructions: [
        '研究這個職業的主要工作內容',
        '了解所需的核心技能和工具',
        '探索職業發展的可能路徑',
        '思考這個職業如何運用 AI 技術'
      ],
      hints: [
        '想想這個職業在未來 5-10 年會如何演變',
        '考慮 AI 工具如何幫助提升工作效率',
        '思考需要哪些軟技能來補充技術能力'
      ],
      completionCriteria: [
        '描述這個職業的三個核心職責',
        '列出五個必備技能',
        '說明 AI 如何改變這個職業'
      ]
    });
    setLoading(false);
  }, [taskId, isLoggedIn, router]);

  const handleSubmit = async () => {
    if (!userResponse.trim()) return;

    setSubmitting(true);
    try {
      // TODO: Submit task response to API
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      // Navigate to completion or next task
      router.push(`/discovery/scenarios/${scenarioId}/programs/${programId}`);
    } catch (error) {
      console.error('Error submitting task:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
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
                {taskData.description}
              </p>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
              <TrophyIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{taskData.xp} XP</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              任務指引
            </h3>
            <ul className="space-y-2">
              {taskData.instructions.map((instruction, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="text-gray-700">{instruction}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Completion Criteria */}
          <div className="bg-purple-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
              <CheckCircleIcon className="w-5 h-5 text-purple-600" />
              <span>完成標準</span>
            </h3>
            <ul className="space-y-2">
              {taskData.completionCriteria.map((criteria, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span className="text-gray-700">{criteria}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Response Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            你的回答
          </h3>
          
          <textarea
            value={userResponse}
            onChange={(e) => setUserResponse(e.target.value)}
            placeholder="在這裡寫下你的回答..."
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
              disabled={!userResponse.trim() || submitting}
              className={`
                flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all
                ${userResponse.trim() && !submitting
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

        {/* Hints Section */}
        {showHints && (
          <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
              <LightBulbIcon className="w-5 h-5 text-yellow-600" />
              <span>提示</span>
            </h4>
            <ul className="space-y-2">
              {taskData.hints.map((hint, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-yellow-600 mt-1">💡</span>
                  <span className="text-gray-700">{hint}</span>
                </li>
              ))}
            </ul>
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
    </DiscoveryPageLayout>
  );
}