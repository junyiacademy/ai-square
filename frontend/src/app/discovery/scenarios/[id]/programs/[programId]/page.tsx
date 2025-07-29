'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import DiscoveryPageLayout from '@/components/discovery/DiscoveryPageLayout';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { normalizeLanguageCode } from '@/lib/utils/language';
import { 
  ArrowLeftIcon,
  SparklesIcon,
  CheckCircleIcon,
  LockClosedIcon,
  PlayIcon,
  ClockIcon,
  TrophyIcon,
  BriefcaseIcon,
  CodeBracketIcon,
  PaintBrushIcon,
  ChartBarIcon,
  RocketLaunchIcon,
  CpuChipIcon,
  VideoCameraIcon,
  CubeIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

interface Task {
  id: string;
  title: string;
  description: string;
  xp: number;
  status: 'locked' | 'available' | 'completed' | 'active';
  completedAt?: string;
  actualXP?: number;  // Actual XP earned (from evaluation)
  attempts?: number;  // Total attempts
  passCount?: number;  // Number of successful attempts
}

interface ProgramData {
  id: string;
  scenarioId: string;
  status: 'active' | 'completed' | 'paused';
  completedTasks: number;
  totalTasks: number;
  totalXP: number;
  tasks: Task[];
  createdAt: string;
  lastActiveAt: string;
  careerType?: string;
  scenarioTitle?: string;
}

export default function ProgramDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { i18n } = useTranslation();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [programData, setProgramData] = useState<ProgramData | null>(null);

  const scenarioId = params.id as string;
  const programId = params.programId as string;

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (authLoading) {
      return;
    }

    if (!isLoggedIn) {
      router.push('/login?redirect=/discovery/scenarios');
      return;
    }

    const loadProgramData = async () => {
    try {
      setLoading(true);
      const sessionToken = localStorage.getItem('ai_square_session');
      const lang = normalizeLanguageCode(i18n.language);
      const response = await fetch(`/api/discovery/scenarios/${scenarioId}/programs/${programId}?t=${Date.now()}&lang=${lang}`, {
        credentials: 'include',
        headers: {
          'x-session-token': sessionToken || '',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load program data');
      }

      const data = await response.json();
      setProgramData(data);
    } catch (error) {
      console.error('Error loading program data:', error);
    } finally {
      setLoading(false);
    }
  };
    
    if (scenarioId && programId) {
      loadProgramData();
    }
  }, [scenarioId, programId, isLoggedIn, authLoading, router, i18n.language]);

  const handleStartTask = (taskId: string) => {
    // Navigate to task learning page
    router.push(`/discovery/scenarios/${scenarioId}/programs/${programId}/tasks/${taskId}`);
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

  if (!programData) {
    return (
      <DiscoveryPageLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500">找不到此學習歷程</p>
          <button
            onClick={() => router.push(`/discovery/scenarios/${scenarioId}`)}
            className="mt-4 text-purple-600 hover:text-purple-700"
          >
            返回職業詳情
          </button>
        </div>
      </DiscoveryPageLayout>
    );
  }

  const progress = programData.totalTasks > 0 
    ? Math.round((programData.completedTasks / programData.totalTasks) * 100)
    : 0;

  // Career info mapping
  const careerInfo: Record<string, { title: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string; skills: string[] }> = {
    'content_creator': {
      title: '數位魔法師 - 內容創作者',
      icon: PaintBrushIcon,
      color: 'from-purple-500 to-pink-500',
      skills: ['內容魔法', '視覺咒語', '文字煉金術', '社群召喚術']
    },
    'youtuber': {
      title: '星際廣播員 - YouTuber',
      icon: VideoCameraIcon,
      color: 'from-red-500 to-orange-500',
      skills: ['星際剪輯術', '觀眾心理學', '宇宙趨勢預測', '跨星系傳播']
    },
    'app_developer': {
      title: '數碼建築師 - 應用程式開發者',
      icon: CodeBracketIcon,
      color: 'from-blue-500 to-cyan-500',
      skills: ['程式魔法', '介面雕塑', '邏輯工程', '系統煉金術']
    },
    'game_designer': {
      title: '夢境織夢師 - 遊戲設計師',
      icon: CubeIcon,
      color: 'from-indigo-500 to-purple-500',
      skills: ['夢境編織', '情感調律', '平衡法則', '心理煉金術']
    },
    'tech_entrepreneur': {
      title: '時空商業旅行者 - 科技創業家',
      icon: RocketLaunchIcon,
      color: 'from-yellow-500 to-red-500',
      skills: ['時空商業洞察', '跨維度技術整合', '團隊召喚術', '創新預言術']
    },
    'startup_founder': {
      title: '商業冒險家 - 創業家',
      icon: BriefcaseIcon,
      color: 'from-green-500 to-teal-500',
      skills: ['商業嗅覺', '市場探勘', '資源煉金術', '風險航海術']
    },
    'data_analyst': {
      title: '數位考古學家 - 數據分析師',
      icon: ChartBarIcon,
      color: 'from-teal-500 to-blue-500',
      skills: ['數位考古術', '模式識別術', '視覺化魔法', '洞察預言術']
    },
    'ux_designer': {
      title: '体驗建築師 - UX 設計師',
      icon: SparklesIcon,
      color: 'from-pink-500 to-purple-500',
      skills: ['用户心理学', '体験魔法', '原型雕塑', '沟通艺术']
    },
    'product_manager': {
      title: '產品指揮官 - 產品經理',
      icon: UserGroupIcon,
      color: 'from-orange-500 to-yellow-500',
      skills: ['策略视野', '需求洞察', '資源配置', '團隊协調']
    },
    'ai_developer': {
      title: '機器靈魂鍛造師 - AI 開發者',
      icon: CpuChipIcon,
      color: 'from-violet-500 to-purple-500',
      skills: ['靈魂編碼術', '神經網絡魔法', '智慧藝術', '未來部署術']
    }
  };

  const currentCareer = careerInfo[programData.careerType || 'unknown'] || {
    title: programData.scenarioTitle || 'Discovery Scenario',
    icon: SparklesIcon,
    color: 'from-gray-500 to-gray-600',
    skills: []
  };
  const CareerIcon = currentCareer.icon;

  return (
    <DiscoveryPageLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/discovery/scenarios/${scenarioId}`)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>返回職業詳情</span>
        </button>

        {/* Career Info Card */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 mb-6 border border-purple-100">
          <div className="flex items-start space-x-4">
            <div className={`w-16 h-16 bg-gradient-to-br ${currentCareer.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <CareerIcon className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{currentCareer.title}</h2>
              {currentCareer.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {currentCareer.skills.map((skill, i) => (
                    <span key={i} className="px-2 py-1 bg-white/70 text-gray-700 text-xs rounded-md">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Program Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                學習歷程
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <ClockIcon className="w-4 h-4" />
                  <span>開始於 {new Date(programData.createdAt).toLocaleDateString('zh-TW')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrophyIcon className="w-4 h-4" />
                  <span>{programData.totalXP} XP</span>
                </div>
              </div>
            </div>
            
            {programData.status === 'active' && (
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                進行中
              </span>
            )}
            {programData.status === 'completed' && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                已完成
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">整體進度</span>
              <span className="text-gray-900 font-medium">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              已完成 {programData.completedTasks} / {programData.totalTasks} 個任務
            </p>
          </div>
        </div>

        {/* Tasks List */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            學習任務
          </h2>
          
          <div className="space-y-4">
            {programData.tasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  bg-white rounded-xl shadow-md border transition-all
                  ${(task.status === 'available' || task.status === 'active')
                    ? 'border-purple-200 hover:shadow-lg cursor-pointer' 
                    : task.status === 'completed'
                    ? 'border-green-100 hover:shadow-lg cursor-pointer'
                    : 'border-gray-100'
                  }
                  ${task.status === 'completed' ? 'bg-gray-50' : ''}
                `}
                onClick={() => (task.status === 'available' || task.status === 'active' || task.status === 'completed') && handleStartTask(task.id)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      {/* Task Icon */}
                      <div className={`
                        p-3 rounded-full
                        ${task.status === 'completed' 
                          ? 'bg-green-100' 
                          : ((task as Task).status === 'available' || (task as Task).status === 'active')
                          ? 'bg-purple-100'
                          : 'bg-gray-100'
                        }
                      `}>
                        {task.status === 'completed' && (
                          <CheckCircleIcon className="w-6 h-6 text-green-600" />
                        )}
                        {((task as Task).status === 'available' || (task as Task).status === 'active') && (
                          <SparklesIcon className="w-6 h-6 text-purple-600" />
                        )}
                        {((task as Task).status === 'locked') && (
                          <LockClosedIcon className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      
                      {/* Task Content */}
                      <div className="flex-1">
                        <h3 className={`
                          text-lg font-semibold mb-1
                          ${task.status === 'completed' ? 'text-gray-600' : 'text-gray-900'}
                        `}>
                          任務 {index + 1}: {typeof task.title === 'object' && task.title !== null ? 
                            (task.title as Record<string, string>)[normalizeLanguageCode(i18n.language)] || 
                            (task.title as Record<string, string>)['en'] || 
                            'Untitled Task' : 
                            task.title as string}
                        </h3>
                        <p className={`
                          text-sm mb-2
                          ${task.status === 'completed' ? 'text-gray-500' : 'text-gray-600'}
                        `}>
                          {typeof task.description === 'object' && task.description !== null ? 
                            (task.description as Record<string, string>)[normalizeLanguageCode(i18n.language)] || 
                            (task.description as Record<string, string>)['en'] || 
                            '' : 
                            task.description as string}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <TrophyIcon className="w-4 h-4 text-yellow-500" />
                            <span className="text-gray-600">
                              {task.status === 'completed' && task.actualXP 
                                ? `${task.actualXP} XP (獲得)` 
                                : `${task.xp} XP`}
                            </span>
                          </div>
                          
                          {task.status === 'completed' && task.attempts && (
                            <>
                              <div className="flex items-center space-x-1">
                                <span className="text-gray-600">📊</span>
                                <span className="text-gray-600">{task.attempts}次嘗試</span>
                              </div>
                              {task.passCount && task.passCount > 0 && (
                                <div className="flex items-center space-x-1">
                                  <span className="text-gray-600">⭐</span>
                                  <span className="text-gray-600">{task.passCount}次通過</span>
                                </div>
                              )}
                            </>
                          )}
                          
                          {task.completedAt && (
                            <span className="text-green-600">
                              完成於 {new Date(task.completedAt).toLocaleDateString('zh-TW')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    {((task as Task).status === 'available' || (task as Task).status === 'active') && (
                      <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                        <PlayIcon className="w-4 h-4" />
                        <span>開始</span>
                      </button>
                    )}
                    {task.status === 'completed' && (
                      <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>檢視</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Generate more tasks if all completed */}
        {programData.completedTasks === programData.totalTasks && programData.totalTasks > 0 && (
          <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-8 text-center">
            <TrophyIcon className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              恭喜完成所有任務！
            </h3>
            <p className="text-gray-600 mb-6">
              你已經完成了這個學習歷程的所有任務，獲得了 {programData.totalXP} XP！
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => router.push(`/discovery/scenarios/${scenarioId}/programs/${programId}/complete`)}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <CheckCircleIcon className="w-5 h-5" />
                <span>查看完整結果</span>
              </button>
              <button
                onClick={() => router.push(`/discovery/scenarios/${scenarioId}`)}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <SparklesIcon className="w-5 h-5" />
                <span>開始新的歷程</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </DiscoveryPageLayout>
  );
}