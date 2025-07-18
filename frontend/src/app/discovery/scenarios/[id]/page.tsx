'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import DiscoveryPageLayout from '@/components/discovery/DiscoveryPageLayout';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { normalizeLanguageCode } from '@/lib/utils/language';
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
  digital_marketer: SparklesIcon,
  social_media_manager: UserGroupIcon,
  product_manager: UserGroupIcon,
  biotech_researcher: SparklesIcon,
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

interface ScenarioData {
  id: string;
  title: string;
  description: string;
  careerType: string;
  objectives: string[];
  metadata?: any;
  programs: any[];
}

export default function DiscoveryScenarioDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { t, i18n } = useTranslation();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  const [creatingProgram, setCreatingProgram] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get scenario ID (UUID) from params
  const scenarioId = params.id as string;

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
      
      const response = await fetch(`/api/discovery/scenarios/${scenarioId}`, {
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
      const lang = normalizeLanguageCode(i18n.language);
      
      const response = await fetch(`/api/discovery/scenarios/${scenarioId}/programs`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-session-token': sessionToken || ''
        },
        credentials: 'include',
        body: JSON.stringify({ language: lang })
      });

      if (response.status === 401) {
        router.push('/login?redirect=/discovery/scenarios');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create program');
      }

      const program = await response.json();
      // Navigate to the new program page
      router.push(`/discovery/scenarios/${scenarioId}/programs/${program.id}`);
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

  if (authLoading || loading) {
    return (
      <DiscoveryPageLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
            <span>{t('discovery:scenarioDetail.loading')}</span>
          </div>
        </div>
      </DiscoveryPageLayout>
    );
  }

  if (!scenarioData) {
    return (
      <DiscoveryPageLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500">{t('discovery:scenarioDetail.notFound')}</p>
          <button
            onClick={() => router.push('/discovery/scenarios')}
            className="mt-4 text-purple-600 hover:text-purple-700"
          >
            {t('discovery:scenarioDetail.backToList')}
          </button>
        </div>
      </DiscoveryPageLayout>
    );
  }

  const careerType = scenarioData.careerType || scenarioData.metadata?.careerType;
  const Icon = careerIcons[careerType] || SparklesIcon;
  const color = careerColors[careerType] || 'from-gray-500 to-gray-600';
  const skills = scenarioData.metadata?.skillFocus || [];

  return (
    <DiscoveryPageLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/discovery/scenarios')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>{t('discovery:scenarioDetail.backToList')}</span>
        </button>

        {/* Career Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className={`h-48 bg-gradient-to-br ${color} relative`}>
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="w-24 h-24 text-white/90" />
            </div>
          </div>
          
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {scenarioData.title}
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              {scenarioData.description}
            </p>
            <p className="text-gray-700 mb-6">
              {scenarioData.metadata?.longDescription || scenarioData.objectives?.[0] || ''}
            </p>
            
            {/* Skills */}
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Programs Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {t('discovery:scenarioDetail.myPrograms')}
            </h2>
            <button
              onClick={createNewProgram}
              disabled={creatingProgram}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <PlusIcon className="w-5 h-5" />
              <span>{creatingProgram ? t('discovery:scenarioDetail.creating') : t('discovery:scenarioDetail.startNewProgram')}</span>
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
                            {t('discovery:programCard.title')} #{index + 1}
                          </h3>
                          {program.status === 'active' && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              {t('discovery:programCard.statusActive')}
                            </span>
                          )}
                          {program.status === 'completed' && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {t('discovery:programCard.statusCompleted')}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="w-4 h-4" />
                            <span>{t('discovery:programCard.startedOn')} {new Date(program.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <TrophyIcon className="w-4 h-4" />
                            <span>{program.totalXP || 0} XP</span>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">{t('discovery:programCard.progress')}</span>
                            <span className="text-gray-900 font-medium">{program.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${program.progress}%` }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {t('discovery:programCard.tasksCompleted', { completed: program.completedTasks, total: program.totalTasks })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex items-center">
                        {program.status === 'active' ? (
                          <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                            <PlayIcon className="w-4 h-4" />
                            <span>{t('discovery:programCard.continue')}</span>
                          </button>
                        ) : program.status === 'completed' ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/discovery/scenarios/${scenarioId}/programs/${program.id}/complete`);
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <TrophyIcon className="w-4 h-4" />
                            <span>{t('discovery:programCard.viewResults')}</span>
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
                {t('discovery:scenarioDetail.noProgramsYet')}
              </p>
              <button
                onClick={createNewProgram}
                disabled={creatingProgram}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <SparklesIcon className="w-5 h-5" />
                <span>{creatingProgram ? t('discovery:scenarioDetail.creating') : t('discovery:scenarioDetail.startFirstProgram')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </DiscoveryPageLayout>
  );
}