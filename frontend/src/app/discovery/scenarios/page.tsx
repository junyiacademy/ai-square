'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import dynamic from 'next/dynamic';
import DiscoveryPageLayout from '@/components/discovery/DiscoveryPageLayout';
import { useUserDataV2 } from '@/hooks/useUserDataV2';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { 
  BriefcaseIcon,
  CodeBracketIcon,
  PaintBrushIcon,
  ChartBarIcon,
  SparklesIcon,
  RocketLaunchIcon,
  CpuChipIcon,
  VideoCameraIcon,
  MegaphoneIcon,
  CubeIcon,
  LightBulbIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

// Career data with icons
const careerScenarios = [
  {
    id: 'content_creator',
    title: '數位魔法師 - 內容創作者',
    subtitle: '在虛擬王國中編織引人入勝的故事',
    category: 'creative',
    icon: PaintBrushIcon,
    color: 'from-purple-500 to-pink-500',
    skills: ['內容魔法', '視覺咒語', '文字煉金術', '社群召喚術']
  },
  {
    id: 'youtuber',
    title: '星際廣播員 - YouTuber',
    subtitle: '在宇宙頻道中傳播知識與歡樂',
    category: 'creative',
    icon: VideoCameraIcon,
    color: 'from-red-500 to-orange-500',
    skills: ['星際剪輯術', '觀眾心理學', '宇宙趨勢預測', '跨星系傳播']
  },
  {
    id: 'app_developer',
    title: '數碼建築師 - 應用程式開發者',
    subtitle: '在賽博城市中建造夢想的數位建築',
    category: 'technology',
    icon: CodeBracketIcon,
    color: 'from-blue-500 to-cyan-500',
    skills: ['程式魔法', '介面雕塑', '邏輯工程', '系統煉金術']
  },
  {
    id: 'game_designer',
    title: '夢境織夢師 - 遊戲設計師',
    subtitle: '在幻想世界中編織互動式夢境',
    category: 'creative',
    icon: CubeIcon,
    color: 'from-indigo-500 to-purple-500',
    skills: ['夢境編織', '情感調律', '平衡法則', '心理煉金術']
  },
  {
    id: 'tech_entrepreneur',
    title: '時空商業旅行者 - 科技創業家',
    subtitle: '在多元宇宙中建立科技商業帝國',
    category: 'hybrid',
    icon: RocketLaunchIcon,
    color: 'from-yellow-500 to-red-500',
    skills: ['時空商業洞察', '跨維度技術整合', '團隊召喚術', '創新預言術']
  },
  {
    id: 'startup_founder',
    title: '商業冒險家 - 創業家',
    subtitle: '在商業荒野中開拓新的貿易路線',
    category: 'business',
    icon: BriefcaseIcon,
    color: 'from-green-500 to-teal-500',
    skills: ['商業嗅覺', '市場探勘', '資源煉金術', '風險航海術']
  },
  {
    id: 'data_analyst',
    title: '數位考古學家 - 數據分析師',
    subtitle: '在數位遺跡中挖掘珍貴的智慧寶石',
    category: 'technology',
    icon: ChartBarIcon,
    color: 'from-teal-500 to-blue-500',
    skills: ['數位考古術', '模式識別術', '視覺化魔法', '洞察預言術']
  },
  {
    id: 'ux_designer',
    title: '体驗建築師 - UX 設計師',
    subtitle: '在数位空间中建造完美的体験世界',
    category: 'creative',
    icon: SparklesIcon,
    color: 'from-pink-500 to-purple-500',
    skills: ['用户心理学', '体验魔法', '原型雕塑', '沟通艺术']
  },
  {
    id: 'product_manager',
    title: '產品指揮官 - 產品經理',
    subtitle: '在產品戰場上統筹策略和資源',
    category: 'business',
    icon: UserGroupIcon,
    color: 'from-orange-500 to-yellow-500',
    skills: ['策略视野', '需求洞察', '資源配置', '團隊协調']
  },
  {
    id: 'ai_developer',
    title: '機器靈魂鍛造師 - AI 開發者',
    subtitle: '在未來實驗室中創造有意識的機器生命',
    category: 'technology',
    icon: CpuChipIcon,
    color: 'from-violet-500 to-purple-500',
    skills: ['靈魂編碼術', '神經網絡魔法', '智慧藝術', '未來部署術']
  }
];

const categoryFilters = [
  { id: 'all', name: '全部', icon: SparklesIcon },
  { id: 'creative', name: '創意', icon: PaintBrushIcon },
  { id: 'technology', name: '技術', icon: CodeBracketIcon },
  { id: 'business', name: '商業', icon: BriefcaseIcon },
  { id: 'hybrid', name: '混合', icon: LightBulbIcon }
];

export default function ScenariosPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const { userData, loadUserData, addWorkspaceSession } = useUserDataV2();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [workspacesByPath, setWorkspacesByPath] = useState<Record<string, any[]>>({});
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('my');

  // Load user data on mount
  useEffect(() => {
    if (isLoggedIn) {
      loadUserData();
    }
  }, [isLoggedIn]);

  // Group workspaces by path
  useEffect(() => {
    if (userData?.workspaceSessions) {
      const grouped = userData.workspaceSessions.reduce((acc, ws) => {
        if (!acc[ws.pathId]) {
          acc[ws.pathId] = [];
        }
        acc[ws.pathId].push(ws);
        return acc;
      }, {} as Record<string, any[]>);
      setWorkspacesByPath(grouped);
    }
  }, [userData?.workspaceSessions]);

  // Get my scenarios (from assessment results or active workspaces)
  const getMyScenarios = () => {
    const myScenarioIds = new Set<string>();
    
    // Add scenarios from saved paths (assessment results)
    if (userData?.savedPaths) {
      userData.savedPaths.forEach(path => {
        if (path.pathData?.id) {
          myScenarioIds.add(path.pathData.id);
        }
      });
    }
    
    // Add scenarios with active workspaces
    if (userData?.workspaceSessions) {
      userData.workspaceSessions.forEach(ws => {
        if (ws.status === 'active' || ws.status === 'completed') {
          myScenarioIds.add(ws.pathId);
        }
      });
    }
    
    return careerScenarios.filter(s => myScenarioIds.has(s.id));
  };

  const myScenarios = getMyScenarios();
  
  const filteredScenarios = activeTab === 'my' 
    ? myScenarios
    : selectedCategory === 'all' 
      ? careerScenarios 
      : careerScenarios.filter(s => s.category === selectedCategory);

  const handleScenarioSelect = async (careerType: string) => {
    if (!isLoggedIn) {
      // Redirect to login
      router.push('/login?redirect=/discovery/scenarios');
      return;
    }

    try {
      // Check if user already has a scenario for this career type
      const sessionToken = localStorage.getItem('ai_square_session');
      const response = await fetch(`/api/discovery/scenarios/find-by-career?career=${careerType}`, {
        credentials: 'include',
        headers: {
          'x-session-token': sessionToken || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.scenarioId) {
          // User already has a scenario for this career, navigate to it
          router.push(`/discovery/scenarios/${data.scenarioId}`);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking existing scenario:', error);
    }

    // Generate a new UUID for the scenario (no prefix needed)
    const scenarioUUID = crypto.randomUUID();
    
    // Navigate to scenario detail page with UUID and pass the career type as a query param
    router.push(`/discovery/scenarios/${scenarioUUID}?career=${careerType}`);
  };

  return (
    <DiscoveryPageLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            探索職業冒險
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            選擇你的職業角色，開始獨特的學習冒險。每個職業都有精心設計的故事情境和挑戰任務。
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-lg p-1 bg-gray-100">
            <button
              onClick={() => setActiveTab('my')}
              className={`
                flex items-center space-x-2 px-6 py-2 rounded-md text-sm font-medium transition-all
                ${activeTab === 'my'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <SparklesIcon className="w-4 h-4" />
              <span>我的副本</span>
              {myScenarios.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                  {myScenarios.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`
                flex items-center space-x-2 px-6 py-2 rounded-md text-sm font-medium transition-all
                ${activeTab === 'all'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <SparklesIcon className="w-4 h-4" />
              <span>全部</span>
            </button>
          </div>
        </div>

        {/* Category Filters - Only show when viewing all */}
        {activeTab === 'all' && (
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
              {categoryFilters.map(filter => {
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedCategory(filter.id)}
                    className={`
                      flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                      ${selectedCategory === filter.id
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{filter.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScenarios.map((scenario, index) => {
            const Icon = scenario.icon;
            const workspaces = workspacesByPath[scenario.id] || [];
            const activeWorkspace = workspaces.find(ws => ws.status === 'active');
            const completedWorkspaces = workspaces.filter(ws => ws.status === 'completed');
            
            // Get match percentage from saved paths
            const savedPath = userData?.savedPaths?.find(p => p.pathData?.id === scenario.id);
            const matchPercentage = savedPath?.matchPercentage;

            return (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative"
              >
                <div
                  onClick={() => handleScenarioSelect(scenario.id)}
                  className="cursor-pointer h-full bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-purple-200"
                >
                  {/* Gradient Background */}
                  <div className={`h-32 bg-gradient-to-br ${scenario.color} relative`}>
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Icon className="w-16 h-16 text-white/90" />
                    </div>
                    
                    {/* Status Badge */}
                    {activeWorkspace && (
                      <div className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur rounded-full">
                        <span className="text-xs font-medium text-purple-700">進行中</span>
                      </div>
                    )}
                    
                    {/* Match Percentage Badge */}
                    {matchPercentage && !activeWorkspace && (
                      <div className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur rounded-full">
                        <span className="text-xs font-medium text-green-700">{matchPercentage}% 匹配</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors">
                      {scenario.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {scenario.subtitle}
                    </p>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {scenario.skills.slice(0, 3).map((skill, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                        >
                          {skill}
                        </span>
                      ))}
                      {scenario.skills.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-md">
                          +{scenario.skills.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Progress Info */}
                    {workspaces.length > 0 && (
                      <div className="pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {completedWorkspaces.length > 0 && `${completedWorkspaces.length} 次完成`}
                          </span>
                          <button className="text-purple-600 hover:text-purple-700 font-medium">
                            {activeWorkspace ? '繼續冒險' : '開始冒險'} →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Start Button for New Users */}
                    {workspaces.length === 0 && (
                      <div className="pt-4 border-t border-gray-100">
                        <button className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all">
                          開始冒險
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredScenarios.length === 0 && (
          <div className="text-center py-16">
            {activeTab === 'my' ? (
              <div>
                <SparklesIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">還沒有屬於你的職業副本</p>
                <p className="text-sm text-gray-400 mb-6">完成評估測驗，發現最適合你的職業冒險</p>
                <button
                  onClick={() => router.push('/discovery/evaluation')}
                  className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  開始評估
                </button>
              </div>
            ) : (
              <p className="text-gray-500">沒有找到符合條件的職業冒險</p>
            )}
          </div>
        )}
      </div>
    </DiscoveryPageLayout>
  );
}