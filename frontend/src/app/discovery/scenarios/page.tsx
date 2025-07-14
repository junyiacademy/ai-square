'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import dynamic from 'next/dynamic';
import DiscoveryPageLayout from '@/components/discovery/DiscoveryPageLayout';
import { useUserData } from '@/hooks/useUserData';
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

// Icon mapping for career types
const careerIcons: Record<string, any> = {
  content_creator: PaintBrushIcon,
  youtuber: VideoCameraIcon,
  app_developer: CodeBracketIcon,
  game_designer: CubeIcon,
  tech_entrepreneur: RocketLaunchIcon,
  startup_founder: BriefcaseIcon,
  data_analyst: ChartBarIcon,
  ux_designer: SparklesIcon,
  ai_engineer: CpuChipIcon,
  ai_developer: CpuChipIcon,
  digital_marketer: MegaphoneIcon,
  social_media_manager: UserGroupIcon,
  product_manager: UserGroupIcon,
  biotech_researcher: LightBulbIcon,
  cybersecurity_specialist: CodeBracketIcon,
  environmental_scientist: ChartBarIcon
};

// Color mapping for career types
const careerColors: Record<string, string> = {
  content_creator: 'from-purple-500 to-pink-500',
  youtuber: 'from-red-500 to-orange-500',
  app_developer: 'from-blue-500 to-cyan-500',
  game_designer: 'from-indigo-500 to-purple-500',
  tech_entrepreneur: 'from-yellow-500 to-red-500',
  startup_founder: 'from-green-500 to-teal-500',
  data_analyst: 'from-teal-500 to-blue-500',
  ux_designer: 'from-pink-500 to-purple-500',
  ai_engineer: 'from-violet-500 to-purple-500',
  ai_developer: 'from-violet-500 to-purple-500',
  digital_marketer: 'from-orange-500 to-red-500',
  social_media_manager: 'from-blue-500 to-indigo-500',
  product_manager: 'from-orange-500 to-yellow-500',
  biotech_researcher: 'from-green-500 to-emerald-500',
  cybersecurity_specialist: 'from-gray-600 to-gray-800',
  environmental_scientist: 'from-green-600 to-teal-600'
};


const categoryFilters = [
  { id: 'all', name: '全部', icon: SparklesIcon },
  { id: 'arts', name: '創意', icon: PaintBrushIcon },
  { id: 'technology', name: '技術', icon: CodeBracketIcon },
  { id: 'business', name: '商業', icon: BriefcaseIcon },
  { id: 'society', name: '社會', icon: UserGroupIcon },
  { id: 'science', name: '科學', icon: LightBulbIcon }
];

export default function ScenariosPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isLoggedIn } = useAuth();
  const { userData, loadUserData } = useUserData();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all'); // Default to 'all' since v2 doesn't track discovery in userData
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);

  // Load scenarios from API
  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const lang = i18n.language === 'zh-TW' ? 'zhTW' : i18n.language;
        const response = await fetch(`/api/discovery/scenarios?lang=${lang}`);
        if (response.ok) {
          const data = await response.json();
          // Transform the scenarios to match the expected format
          const transformedScenarios = data.map((scenario: any) => ({
            id: scenario.sourceRef?.metadata?.careerType || scenario.id,
            scenarioId: scenario.id, // Store the actual scenario UUID
            title: scenario.title,
            subtitle: scenario.description,
            category: scenario.metadata?.category || 'general',
            icon: careerIcons[scenario.sourceRef?.metadata?.careerType] || SparklesIcon,
            color: careerColors[scenario.sourceRef?.metadata?.careerType] || 'from-gray-500 to-gray-600',
            skills: scenario.metadata?.skillFocus || []
          }));
          setScenarios(transformedScenarios);
        } else {
          console.error('Failed to fetch scenarios from API');
          setScenarios([]);
        }
      } catch (error) {
        console.error('Failed to fetch scenarios:', error);
        setScenarios([]);
      } finally {
        setIsLoadingScenarios(false);
      }
    };

    fetchScenarios();
  }, [i18n.language]);

  // Load user data on mount
  useEffect(() => {
    if (isLoggedIn) {
      loadUserData();
    }
  }, [isLoggedIn]);


  // Get my scenarios - in v2 architecture, discovery scenarios are tracked separately
  const getMyScenarios = () => {
    // Discovery scenarios use the unified learning architecture (v2) with Programs/Tasks
    // They are NOT tracked in userData's savedPaths or workspaceSessions
    // savedPaths are for assessment results, which is a different system
    
    // TODO: Implement proper v2 discovery scenario tracking through Program repository
    // For now, return empty array since v2 doesn't track discovery in userData
    return [];
  };

  const myScenarios = getMyScenarios();
  
  const filteredScenarios = activeTab === 'my' 
    ? myScenarios
    : selectedCategory === 'all' 
      ? scenarios 
      : scenarios.filter(s => s.category === selectedCategory);

  const handleScenarioSelect = async (scenarioOrCareer: any) => {
    if (!isLoggedIn) {
      // Redirect to login
      router.push('/login?redirect=/discovery/scenarios');
      return;
    }

    // Check if we have a scenario object (from API) or just a career string (from fallback)
    if (typeof scenarioOrCareer === 'object' && scenarioOrCareer.scenarioId) {
      // We have a scenario from the API, navigate directly to it
      router.push(`/discovery/scenarios/${scenarioOrCareer.scenarioId}`);
    } else {
      // Fallback: try to find the scenario by career type
      const careerType = typeof scenarioOrCareer === 'string' ? scenarioOrCareer : scenarioOrCareer.id;
      const scenario = scenarios.find(s => s.id === careerType);
      
      if (scenario && scenario.scenarioId) {
        router.push(`/discovery/scenarios/${scenario.scenarioId}`);
      } else {
        // Old behavior for fallback
        alert('Scenario not found. Please refresh the page and try again.');
      }
    }
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

        {/* Tab Switcher - Hidden for now since v2 doesn't track discovery scenarios in userData */}
        {/* TODO: Implement proper v2 discovery scenario tracking through Program repository */}

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

        {/* Loading State */}
        {isLoadingScenarios && (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-500">載入職業冒險中...</p>
          </div>
        )}

        {/* Scenarios Grid */}
        {!isLoadingScenarios && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredScenarios.map((scenario, index) => {
            const Icon = scenario.icon;
            // v2 architecture doesn't track discovery scenarios in userData
            const activeWorkspace = null;
            const completedWorkspaces = [];
            const matchPercentage = null;

            return (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative"
              >
                <div
                  onClick={() => handleScenarioSelect(scenario)}
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

                    {/* Start Button */}
                    <div className="pt-4 border-t border-gray-100">
                      <button className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all">
                        開始冒險
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          </div>
        )}

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