'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  RocketLaunchIcon,
  ClockIcon,
  TrophyIcon,
  PlayIcon,
  PlusIcon,
  ChevronRightIcon,
  AcademicCapIcon
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
const careerIcons: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
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
  mode: string;
  difficulty: string;
  estimatedMinutes: number;
  discoveryData?: {
    pathId?: string;
    category?: string;
    careerInsights?: {
      job_market?: {
        demand?: string;
        growth_rate?: string;
        salary_range?: string;
        job_titles?: string[];
      };
      required_skills?: {
        technical?: string[];
        soft?: string[];
      };
      typical_day?: Record<string, string>;
    };
    worldSetting?: {
      name?: Record<string, string>;
      description?: Record<string, string>;
    };
    startingScenario?: {
      title?: Record<string, string>;
      description?: Record<string, string>;
    };
  };
  metadata?: Record<string, unknown>;
  taskTemplates?: Array<Record<string, unknown>>;
  careerType?: string; // For backward compatibility
}

interface ProgramData {
  id: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  currentTaskIndex?: number;
  metadata?: {
    totalXP?: number;
    completedTasks?: number;
    totalTasks?: number;
  };
}

export default function DiscoveryScenarioDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { t, i18n } = useTranslation();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  const [programs, setPrograms] = useState<ProgramData[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
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
      // API returns { success, data: { scenario } }
      if (data.success && data.data?.scenario) {
        setScenarioData(data.data.scenario);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error loading scenario data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load scenario data');
    } finally {
      setLoading(false);
    }
  };

    if (scenarioId) {
      loadScenarioData();
      loadPrograms();
    }
  }, [scenarioId, isLoggedIn, authLoading, router, i18n.language, loadPrograms]);

  const loadPrograms = useCallback(async () => {
    try {
      setLoadingPrograms(true);
      const sessionToken = localStorage.getItem('ai_square_session');
      
      const response = await fetch(`/api/discovery/scenarios/${scenarioId}/programs?lang=${i18n.language}`, {
        credentials: 'include',
        headers: {
          'x-session-token': sessionToken || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPrograms(data.programs || []);
      }
    } catch (error) {
      console.error('Error loading programs:', error);
    } finally {
      setLoadingPrograms(false);
    }
  }, [scenarioId, i18n.language]);

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

  const careerType = (scenarioData.discoveryData?.pathId || scenarioData.metadata?.yamlId || scenarioData.careerType || 'app_developer') as string;
  const Icon = careerIcons[careerType as keyof typeof careerIcons] || SparklesIcon;
  const color = careerColors[careerType as keyof typeof careerColors] || 'from-gray-500 to-gray-600';
  const skills = (scenarioData.metadata?.skillFocus || []) as string[];

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
              {(scenarioData.metadata?.longDescription as string) || scenarioData.objectives?.[0] || ''}
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

          {/* Programs List or Start Button */}
          {loadingPrograms ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading programs...</p>
            </div>
          ) : programs.length > 0 ? (
            <div className="grid gap-4 mt-6">
              {programs.map((program) => (
                <div key={program.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                     onClick={() => router.push(`/discovery/scenarios/${scenarioId}/programs/${program.id}`)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {program.status === 'completed' ? '✅ ' : '🚀 '}
                          Learning Journey #{programs.indexOf(program) + 1}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          program.status === 'completed' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {program.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Started {new Date(program.createdAt).toLocaleDateString()}
                        {program.completedAt && ` • Completed ${new Date(program.completedAt).toLocaleDateString()}`}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <span>💎 {program.metadata?.totalXP || 0} XP</span>
                        <span>📊 {program.metadata?.completedTasks || 0}/{program.metadata?.totalTasks || 6} 個任務</span>
                        {program.metadata?.completedTasks && program.metadata?.totalTasks && (
                          <span className="text-purple-600 font-medium">
                            ({Math.round((program.metadata.completedTasks / program.metadata.totalTasks) * 100)}% 完成)
                          </span>
                        )}
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.round(((program.metadata?.completedTasks || 0) / (program.metadata?.totalTasks || 6)) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={createNewProgram}
                disabled={creatingProgram}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform transition-all disabled:opacity-50"
              >
                {creatingProgram ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{t('discovery:scenarioDetail.creating')}</span>
                  </span>
                ) : (
                  t('discovery:scenarioDetail.startExploration')
                )}
              </motion.button>
              <p className="mt-4 text-gray-600">
                {t('discovery:scenarioDetail.readyToStart')}
              </p>
            </div>
          )}
          
          {/* Career Insights */}
          {scenarioData.discoveryData?.careerInsights && (
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              {/* Job Market */}
              {scenarioData.discoveryData.careerInsights.job_market && (
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <ChartBarIcon className="w-5 h-5 mr-2 text-purple-600" />
                    {t('discovery:scenarioDetail.jobMarket')}
                  </h3>
                  <div className="space-y-2 text-sm">
                    {scenarioData.discoveryData.careerInsights.job_market.demand && (
                      <p><span className="font-medium">{t('discovery:scenarioDetail.demand')}:</span> {scenarioData.discoveryData.careerInsights.job_market.demand}</p>
                    )}
                    {scenarioData.discoveryData.careerInsights.job_market.growth_rate && (
                      <p><span className="font-medium">{t('discovery:scenarioDetail.growth')}:</span> {scenarioData.discoveryData.careerInsights.job_market.growth_rate}</p>
                    )}
                    {scenarioData.discoveryData.careerInsights.job_market.salary_range && (
                      <p><span className="font-medium">{t('discovery:scenarioDetail.salary')}:</span> {scenarioData.discoveryData.careerInsights.job_market.salary_range}</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Required Skills */}
              {scenarioData.discoveryData.careerInsights.required_skills && (
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <AcademicCapIcon className="w-5 h-5 mr-2 text-purple-600" />
                    {t('discovery:scenarioDetail.requiredSkills')}
                  </h3>
                  <div className="space-y-3">
                    {scenarioData.discoveryData.careerInsights.required_skills.technical && (
                      <div>
                        <p className="font-medium text-sm mb-1">{t('discovery:scenarioDetail.technical')}:</p>
                        <div className="flex flex-wrap gap-2">
                          {scenarioData.discoveryData.careerInsights.required_skills.technical.map((skill, idx) => (
                            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {scenarioData.discoveryData.careerInsights.required_skills.soft && (
                      <div>
                        <p className="font-medium text-sm mb-1">{t('discovery:scenarioDetail.soft')}:</p>
                        <div className="flex flex-wrap gap-2">
                          {scenarioData.discoveryData.careerInsights.required_skills.soft.map((skill, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Hidden programs section for future use */}
          {false && (
            <div className="grid gap-4">
              {[].map((program: ProgramData, index) => (
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
                            <span>{t('discovery:programCard.startedOn')} {new Date(program.startedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <TrophyIcon className="w-4 h-4" />
                            <span>{(program.metadata?.totalXP as number) || 0} XP</span>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">{t('discovery:programCard.progress')}</span>
                            <span className="text-gray-900 font-medium">{(program.metadata?.progress as number) || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${(program.metadata?.progress as number) || 0}%` }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {t('discovery:programCard.tasksCompleted', { completed: (program.metadata?.completedTasks as number) || 0, total: (program.metadata?.totalTasks as number) || 0 })}
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
          )}
        </div>
      </div>
    </DiscoveryPageLayout>
  );
}