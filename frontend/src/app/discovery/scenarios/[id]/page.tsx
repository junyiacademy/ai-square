'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import DiscoveryPageLayout from '@/components/discovery/DiscoveryPageLayout';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon,
  SparklesIcon,
  RocketLaunchIcon,
  ClockIcon,
  TrophyIcon,
  PlayIcon,
  PlusIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import {
  BriefcaseIcon,
  CodeBracketIcon,
  PaintBrushIcon,
  ChartBarIcon,
  CpuChipIcon,
  VideoCameraIcon,
  CubeIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

// Career data (should match the data in scenarios page)
const careerData: Record<string, any> = {
  'content_creator': {
    title: '數位魔法師 - 內容創作者',
    subtitle: '在虛擬王國中編織引人入勝的故事',
    category: 'creative',
    icon: PaintBrushIcon,
    color: 'from-purple-500 to-pink-500',
    skills: ['內容魔法', '視覺咒語', '文字煉金術', '社群召喚術'],
    description: '作為數位魔法師，你將學習如何在虛擬世界中創造引人入勝的內容。從視覺設計到文案撰寫，從社群經營到品牌建立，你將掌握現代內容創作的所有秘訣。'
  },
  'youtuber': {
    title: '星際廣播員 - YouTuber',
    subtitle: '在宇宙頻道中傳播知識與歡樂',
    category: 'creative',
    icon: VideoCameraIcon,
    color: 'from-red-500 to-orange-500',
    skills: ['星際剪輯術', '觀眾心理學', '宇宙趨勢預測', '跨星系傳播'],
    description: '成為星際廣播員，在YouTube宇宙中建立自己的頻道王國。學習影片製作、剪輯技巧、觀眾互動和頻道成長策略，打造屬於你的影音帝國。'
  },
  'app_developer': {
    title: '數碼建築師 - 應用程式開發者',
    subtitle: '在賽博城市中建造夢想的數位建築',
    category: 'technology',
    icon: CodeBracketIcon,
    color: 'from-blue-500 to-cyan-500',
    skills: ['程式魔法', '介面雕塑', '邏輯工程', '系統煉金術'],
    description: '踏入數碼建築的世界，學習如何設計和開發改變世界的應用程式。從前端到後端，從移動到網頁，掌握現代軟體開發的全棧技能。'
  },
  'game_designer': {
    title: '夢境織夢師 - 遊戲設計師',
    subtitle: '在幻想世界中編織互動式夢境',
    category: 'creative',
    icon: CubeIcon,
    color: 'from-indigo-500 to-purple-500',
    skills: ['夢境編織', '情感調律', '平衡法則', '心理煉金術'],
    description: '成為夢境織夢師，創造讓玩家沉浸其中的遊戲世界。學習遊戲機制設計、關卡設計、敘事技巧和玩家心理學，打造難忘的遊戲體驗。'
  },
  'tech_entrepreneur': {
    title: '時空商業旅行者 - 科技創業家',
    subtitle: '在多元宇宙中建立科技商業帝國',
    category: 'hybrid',
    icon: RocketLaunchIcon,
    color: 'from-yellow-500 to-red-500',
    skills: ['時空商業洞察', '跨維度技術整合', '團隊召喚術', '創新預言術'],
    description: '踏上科技創業的冒險之旅，學習如何將創新想法轉化為成功的商業模式。掌握產品開發、市場分析、團隊建設和融資策略。'
  },
  'startup_founder': {
    title: '商業冒險家 - 創業家',
    subtitle: '在商業荒野中開拓新的貿易路線',
    category: 'business',
    icon: BriefcaseIcon,
    color: 'from-green-500 to-teal-500',
    skills: ['商業嗅覺', '市場探勘', '資源煉金術', '風險航海術'],
    description: '成為商業冒險家，在充滿機遇與挑戰的市場中開拓自己的道路。學習商業策略、財務管理、營銷技巧和領導力。'
  },
  'data_analyst': {
    title: '數位考古學家 - 數據分析師',
    subtitle: '在數位遺跡中挖掘珍貴的智慧寶石',
    category: 'technology',
    icon: ChartBarIcon,
    color: 'from-teal-500 to-blue-500',
    skills: ['數位考古術', '模式識別術', '視覺化魔法', '洞察預言術'],
    description: '深入數據的神秘世界，學習如何從海量資訊中提取有價值的洞察。掌握統計分析、機器學習、數據視覺化和商業智慧。'
  },
  'ux_designer': {
    title: '体驗建築師 - UX 設計師',
    subtitle: '在数位空间中建造完美的体験世界',
    category: 'creative',
    icon: SparklesIcon,
    color: 'from-pink-500 to-purple-500',
    skills: ['用户心理学', '体験魔法', '原型雕塑', '沟通艺术'],
    description: '成為體驗建築師，設計讓用戶愛不釋手的數位產品。學習用戶研究、原型設計、可用性測試和設計系統建立。'
  },
  'product_manager': {
    title: '產品指揮官 - 產品經理',
    subtitle: '在產品戰場上統筹策略和資源',
    category: 'business',
    icon: UserGroupIcon,
    color: 'from-orange-500 to-yellow-500',
    skills: ['策略视野', '需求洞察', '資源配置', '團隊协調'],
    description: '擔任產品指揮官，領導團隊打造成功的產品。學習產品策略、需求分析、專案管理和跨團隊協作。'
  },
  'ai_developer': {
    title: '機器靈魂鍛造師 - AI 開發者',
    subtitle: '在未來實驗室中創造有意識的機器生命',
    category: 'technology',
    icon: CpuChipIcon,
    color: 'from-violet-500 to-purple-500',
    skills: ['靈魂編碼術', '神經網絡魔法', '智慧藝術', '未來部署術'],
    description: '進入AI的神秘領域，學習如何創造智能系統。掌握機器學習、深度學習、自然語言處理和計算機視覺技術。'
  }
};

interface Program {
  id: string;
  scenarioId: string;
  createdAt: string;
  status: 'active' | 'completed' | 'paused';
  completedTasks: number;
  totalTasks: number;
  progress: number;
  lastActiveAt: string;
  totalXP: number;
}

interface ScenarioData {
  id: string;
  programs: Program[];
  createdAt: string;
  lastActiveAt: string;
}

export default function ScenarioDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  const [creatingProgram, setCreatingProgram] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [career, setCareer] = useState<any>(null);

  // Get scenario ID (UUID) from params
  const scenarioId = params.id as string;
  
  // Parse query params to get career type
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const careerType = searchParams.get('career');
    
    if (careerType && careerData[careerType]) {
      setCareer(careerData[careerType]);
    }
  }, []);

  useEffect(() => {
    // Wait for auth check to complete
    if (authLoading) {
      return;
    }

    if (!isLoggedIn) {
      router.push('/login?redirect=/discovery/scenarios');
      return;
    }

    if (scenarioId) {
      loadScenarioData();
    }
  }, [scenarioId, isLoggedIn, authLoading]);

  const loadScenarioData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get session token from localStorage for API calls
      const sessionToken = localStorage.getItem('ai_square_session');
      const searchParams = new URLSearchParams(window.location.search);
      const careerType = searchParams.get('career');
      
      const response = await fetch(`/api/discovery/scenarios/${scenarioId}?career=${careerType || ''}`, {
        credentials: 'include',
        headers: {
          'x-session-token': sessionToken || ''
        }
      });

      if (response.status === 401) {
        // Session expired, redirect to login
        router.push('/login?redirect=/discovery/scenarios');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load scenario data');
      }

      const data = await response.json();
      setScenarioData(data);
      
      // If the scenario has a career type stored, use it
      if (data.careerType && careerData[data.careerType]) {
        setCareer(careerData[data.careerType]);
      }
    } catch (error) {
      console.error('Error loading scenario data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load scenario data');
    } finally {
      setLoading(false);
    }
  };

  const createNewProgram = async () => {
    try {
      setCreatingProgram(true);
      const sessionToken = localStorage.getItem('ai_square_session');
      
      const response = await fetch(`/api/discovery/scenarios/${scenarioId}/programs`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-session-token': sessionToken || ''
        },
        credentials: 'include',
        body: JSON.stringify({ language: 'zhTW' })
      });

      if (response.status === 401) {
        router.push('/login?redirect=/discovery/scenarios');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create program');
      }

      const newProgram = await response.json();
      
      // Navigate to the new program
      router.push(`/discovery/scenarios/${scenarioId}/programs/${newProgram.id}`);
    } catch (error) {
      console.error('Error creating program:', error);
      setError(error instanceof Error ? error.message : 'Failed to create program');
    } finally {
      setCreatingProgram(false);
    }
  };

  const handleSelectProgram = (programId: string) => {
    router.push(`/discovery/scenarios/${scenarioId}/programs/${programId}`);
  };

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <DiscoveryPageLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
            <span>驗證中...</span>
          </div>
        </div>
      </DiscoveryPageLayout>
    );
  }

  if (!career) {
    return (
      <DiscoveryPageLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500">找不到此職業冒險</p>
          <button
            onClick={() => router.push('/discovery/scenarios')}
            className="mt-4 text-purple-600 hover:text-purple-700"
          >
            返回職業列表
          </button>
        </div>
      </DiscoveryPageLayout>
    );
  }

  const Icon = career.icon;

  return (
    <DiscoveryPageLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/discovery/scenarios')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>返回職業列表</span>
        </button>

        {/* Career Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className={`h-48 bg-gradient-to-br ${career.color} relative`}>
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="w-24 h-24 text-white/90" />
            </div>
          </div>
          
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {career.title}
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              {career.subtitle}
            </p>
            <p className="text-gray-700 mb-6">
              {career.description}
            </p>
            
            {/* Skills */}
            <div className="flex flex-wrap gap-2">
              {career.skills.map((skill: string, index: number) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center space-x-2 text-gray-500">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
              <span>載入中...</span>
            </div>
          </div>
        )}

        {/* Programs Section */}
        {!loading && scenarioData && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                我的學習歷程
              </h2>
              <button
                onClick={createNewProgram}
                disabled={creatingProgram}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <PlusIcon className="w-5 h-5" />
                <span>{creatingProgram ? '創建中...' : '開始新歷程'}</span>
              </button>
            </div>

            {/* Programs List */}
            {scenarioData.programs.length > 0 ? (
              <div className="grid gap-4">
                {scenarioData.programs.map((program, index) => (
                  <motion.div
                    key={program.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleSelectProgram(program.id)}
                    className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-100 hover:border-purple-200"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              學習歷程 #{index + 1}
                            </h3>
                            {program.status === 'active' && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                進行中
                              </span>
                            )}
                            {program.status === 'completed' && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                已完成
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <ClockIcon className="w-4 h-4" />
                              <span>開始於 {new Date(program.createdAt).toLocaleDateString('zh-TW')}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <TrophyIcon className="w-4 h-4" />
                              <span>{program.totalXP} XP</span>
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-600">完成進度</span>
                              <span className="text-gray-900 font-medium">{program.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${program.progress}%` }}
                              />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              {program.completedTasks} / {program.totalTasks} 個任務完成
                            </p>
                          </div>
                        </div>
                        
                        <div className="ml-4 flex items-center">
                          {program.status === 'active' ? (
                            <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                              <PlayIcon className="w-4 h-4" />
                              <span>繼續</span>
                            </button>
                          ) : (
                            <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-12 text-center">
                <RocketLaunchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-6">
                  還沒有開始任何學習歷程
                </p>
                <button
                  onClick={createNewProgram}
                  disabled={creatingProgram}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <SparklesIcon className="w-5 h-5" />
                  <span>{creatingProgram ? '創建中...' : '開始第一個歷程'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </DiscoveryPageLayout>
  );
}