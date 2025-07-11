'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  PlayIcon,
  SparklesIcon,
  CpuChipIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  ClockIcon,
  UserGroupIcon,
  FolderOpenIcon,
  ChevronDownIcon,
  PlusIcon,
  HeartIcon,
  TrashIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

// Import types from the unified service
import type { 
  AssessmentResults, 
  WorkspaceSession, 
  SavedPathData 
} from '@/lib/services/user-data-service';
import { DiscoveryYAMLLoader } from '@/lib/services/discovery-yaml-loader';

interface PathResultsProps {
  results: AssessmentResults | null;
  onPathSelect: (pathId: string, workspaceId?: string) => void;
  workspaceSessions?: WorkspaceSession[];
  savedPaths?: SavedPathData[];
  onToggleFavorite?: (pathId: string) => void;
  onDeletePath?: (pathId: string) => void;
  onRetakeAssessment?: () => void;
  onGenerateCustomPath?: (preferences: any) => Promise<void>;
}

interface PathData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  skills: string[];
  aiAssistants: string[];
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    duration: string;
  }>;
  // Extended fields for custom paths
  savedPathId?: string;
  matchPercentage?: number;
  isFavorite?: boolean;
  isCustom?: boolean;
  createdAt?: string;
  assessmentId?: string;
}

export default function PathResults({ 
  results, 
  onPathSelect, 
  workspaceSessions = [], 
  savedPaths = [],
  onToggleFavorite,
  onDeletePath,
  onRetakeAssessment,
  onGenerateCustomPath
}: PathResultsProps) {
  const { t } = useTranslation('discovery');
  const [viewMode, setViewMode] = React.useState<'latest' | 'all' | 'favorites'>('latest');
  const [showGenerateOption, setShowGenerateOption] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [customPrompt, setCustomPrompt] = React.useState('');
  const [selectedPreference, setSelectedPreference] = React.useState<string | null>(null);

  // Enhanced path data from YAML files
  const [pathDataCache, setPathDataCache] = React.useState<Record<string, any>>({});
  const [isLoadingPathData, setIsLoadingPathData] = React.useState(false);

  // Preload path data for all saved paths
  React.useEffect(() => {
    if (!savedPaths || savedPaths.length === 0) return;

    const loadAllPathData = async () => {
      setIsLoadingPathData(true);
      const uniquePathIds = [...new Set(savedPaths.map(sp => sp.pathData?.id).filter(Boolean))];
      
      // Create a new cache object to avoid referencing stale state
      const newCache: Record<string, any> = {};
      
      // Load all path data in parallel
      const loadPromises = uniquePathIds.map(async (pathId) => {
        try {
          const pathData = await DiscoveryYAMLLoader.loadPath(pathId, 'zhTW');
          if (pathData) {
            return {
              pathId,
              data: {
                id: pathId,
                title: pathData.metadata.title,
                subtitle: pathData.metadata.short_description,
                description: pathData.metadata.long_description,
                category: pathData.category,
                skills: pathData.metadata.skill_focus || [],
                aiAssistants: [],
                tasks: pathData.example_tasks?.beginner?.map((task: any) => ({
                  id: task.id,
                  title: task.title,
                  description: task.description,
                  duration: "20分鐘"
                })) || []
              }
            };
          }
        } catch (error) {
          console.error(`Failed to load path data for ${pathId}:`, error);
        }
        return null;
      });

      const results = await Promise.all(loadPromises);
      
      results.forEach(result => {
        if (result) {
          newCache[result.pathId] = result.data;
        }
      });

      setPathDataCache(newCache);
      setIsLoadingPathData(false);
    };

    loadAllPathData();
  }, [savedPaths]); // Don't include pathDataCache in dependencies to avoid infinite loop

  const getEnhancedPathData = React.useCallback(async (pathId: string) => {
    // Check cache first
    if (pathDataCache[pathId]) {
      return pathDataCache[pathId];
    }

    // Don't set loading state for individual path loads to avoid UI flicker
    try {
      const pathData = await DiscoveryYAMLLoader.loadPath(pathId, 'zhTW');
      if (pathData) {
        // Transform YAML data to match the expected format
        const transformedData = {
          title: pathData.metadata.title,
          subtitle: pathData.metadata.short_description,
          description: pathData.metadata.long_description,
          category: pathData.category === 'arts' ? 'creative' : 
                   pathData.category === 'society' ? 'business' : 
                   pathData.category === 'science' ? 'technology' : 
                   pathData.category,
          skills: pathData.metadata.skill_focus || [],
          aiAssistants: [], // Will be populated from skill tree or tasks
          worldSetting: pathData.world_setting?.name && pathData.world_setting?.description 
            ? `${pathData.world_setting.name} - ${pathData.world_setting.description}`
            : '',
          protagonist: pathData.starting_scenario ? {
            name: "見習冒險者",
            background: pathData.starting_scenario.description
          } : undefined,
          storyContext: {
            currentConflict: pathData.starting_scenario?.description || ''
          },
          tasks: pathData.example_tasks?.beginner?.map((task: any) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            duration: "20分鐘" // Default duration
          })) || []
        };

        // Update cache
        setPathDataCache(prev => ({ ...prev, [pathId]: transformedData }));
        return transformedData;
      }
    } catch (error) {
      console.error(`Failed to load path data for ${pathId}:`, error);
    }

    return null;
  }, [pathDataCache]);

  // Load all path data on mount
  React.useEffect(() => {
    const loadAllPathData = async () => {
      setIsLoadingPathData(true);
      const pathIds = new Set(savedPaths.map(p => p.pathData.id));
      
      for (const pathId of pathIds) {
        if (!pathDataCache[pathId]) {
          await getEnhancedPathData(pathId);
        }
      }
      
      setIsLoadingPathData(false);
    };

    if (savedPaths.length > 0) {
      loadAllPathData();
    }
  }, [savedPaths, getEnhancedPathData]);

  // Get paths to display based on view mode
  const getPathsToDisplay = () => {
    let pathsToShow = savedPaths;
    
    switch (viewMode) {
      case 'latest':
        // Show only latest assessment results
        if (results && savedPaths.length > 0) {
          const latestAssessmentId = savedPaths
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
            ?.assessmentId;
          pathsToShow = savedPaths.filter(p => p.assessmentId === latestAssessmentId);
        }
        break;
      case 'favorites':
        pathsToShow = savedPaths.filter(p => p.isFavorite);
        break;
      case 'all':
      default:
        pathsToShow = savedPaths;
        break;
    }
    
    return pathsToShow
      .map(savedPath => {
        // For custom paths, use the saved data directly
        if (savedPath.isCustom && savedPath.pathData) {
          return {
            ...savedPath.pathData,
            id: savedPath.pathData.id,
            savedPathId: savedPath.id,
            matchPercentage: savedPath.matchPercentage,
            isFavorite: savedPath.isFavorite,
            isCustom: savedPath.isCustom,
            createdAt: savedPath.createdAt,
            assessmentId: savedPath.assessmentId
          };
        }
        
        // Try to get cached enhanced data
        const enhancedData = pathDataCache[savedPath.pathData.id];
        if (enhancedData) {
          return {
            ...enhancedData,
            id: savedPath.pathData.id,
            savedPathId: savedPath.id,
            matchPercentage: savedPath.matchPercentage,
            isFavorite: savedPath.isFavorite,
            isCustom: savedPath.isCustom,
            createdAt: savedPath.createdAt,
            assessmentId: savedPath.assessmentId
          };
        }
        
        // Fallback to translations
        const pathData = t(`careers.${savedPath.pathData.id}`, { returnObjects: true, defaultValue: null });
        
        // If translation found, use it
        if (pathData && typeof pathData === 'object') {
          return {
            ...pathData,
            id: savedPath.pathData.id,
            savedPathId: savedPath.id,
            matchPercentage: savedPath.matchPercentage,
            isFavorite: savedPath.isFavorite,
            isCustom: savedPath.isCustom,
            createdAt: savedPath.createdAt,
            assessmentId: savedPath.assessmentId
          };
        }
        
        // Final fallback - use saved data if available
        return {
          id: savedPath.pathData.id,
          title: savedPath.pathData.title || savedPath.pathData.id, // Use title if available
          subtitle: savedPath.pathData.subtitle || '',
          description: savedPath.pathData.description || '',
          category: savedPath.pathData.category || 'technology',
          skills: savedPath.pathData.skills || [],
          aiAssistants: savedPath.pathData.aiAssistants || [],
          tasks: savedPath.pathData.tasks || [],
          savedPathId: savedPath.id,
          matchPercentage: savedPath.matchPercentage,
          isFavorite: savedPath.isFavorite,
          isCustom: savedPath.isCustom,
          createdAt: savedPath.createdAt,
          assessmentId: savedPath.assessmentId
        };
      })
      .sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
  };

  // Separate custom and standard paths
  const categorizedPaths = React.useMemo(() => {
    const paths = getPathsToDisplay();
    const standardPaths = paths.filter(p => !p.isCustom);
    const customPaths = paths.filter(p => p.isCustom);
    
    return {
      topRecommended: standardPaths.slice(0, 3),
      otherPaths: standardPaths.slice(3),
      customPaths
    };
  }, [savedPaths, viewMode, results]);

  // Handle custom path generation
  const handleGenerateCustomPath = async () => {
    if (!onGenerateCustomPath) return;
    
    setIsGenerating(true);
    try {
      await onGenerateCustomPath({
        preference: selectedPreference,
        customPrompt,
        assessmentResults: results
      });
      setShowGenerateOption(false);
      setCustomPrompt('');
      setSelectedPreference(null);
    } catch (error) {
      console.error('Failed to generate custom path:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const displayPaths = getPathsToDisplay();

  // Get personality type based on highest score
  const getPersonalityType = (): string => {
    if (!results) return '探索者';
    
    const { tech, creative, business } = results;
    
    if (tech > creative && tech > business) {
      return '技術導向創新者';
    } else if (creative > tech && creative > business) {
      return '創意思維探索者';
    } else if (business > tech && business > creative) {
      return '商業策略規劃者';
    } else {
      return '多元發展潛力者';
    }
  };

  const getCategoryIcon = (category: string | undefined) => {
    if (!category) return SparklesIcon;
    
    switch (category.toLowerCase()) {
      case 'creative':
      case '創意':
        return PaintBrushIcon;
      case 'technology':
      case '科技':
        return CpuChipIcon;
      case 'business':
      case '商業':
        return GlobeAltIcon;
      default:
        return SparklesIcon;
    }
  };

  const getCategoryColor = (category: string | undefined) => {
    if (!category) return 'from-purple-500 to-blue-500';
    
    switch (category.toLowerCase()) {
      case 'creative':
      case '創意':
        return 'from-pink-500 to-purple-500';
      case 'technology':
      case '科技':
        return 'from-blue-500 to-cyan-500';
      case 'business':
      case '商業':
        return 'from-green-500 to-emerald-500';
      default:
        return 'from-purple-500 to-blue-500';
    }
  };

  // Get workspaces for a specific path
  const getPathWorkspaces = (pathId: string) => {
    return workspaceSessions.filter(ws => ws.pathId === pathId);
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '剛剛';
    if (diffInHours < 24) return `${diffInHours} 小時前`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} 天前`;
    return date.toLocaleDateString('zh-TW');
  };

  // Handle loading state
  if (isLoadingPathData && savedPaths.length > 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-24 h-24 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <SparklesIcon className="w-12 h-12 text-purple-600 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            載入冒險副本中...
          </h2>
        </motion.div>
      </div>
    );
  }

  // Handle empty state
  if (savedPaths.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-24 h-24 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <GlobeAltIcon className="w-12 h-12 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            還沒有任何冒險副本
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            完成興趣評估來發現適合你的冒險副本，開始你的個人化冒險之旅！
          </p>
          {onRetakeAssessment && (
            <motion.button
              onClick={onRetakeAssessment}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow"
            >
              <SparklesIcon className="w-5 h-5" />
              <span>開始興趣評估</span>
            </motion.button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          你的冒險副本
        </h2>
        <p className="text-lg text-gray-600 mb-6">
          基於你的興趣評估結果，為你推薦合適的冒險副本
        </p>
        
        {/* Personality Type */}
        {results && (
          <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-purple-100 to-blue-100 px-6 py-3 rounded-full">
            <SparklesIcon className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-purple-800">
              你的類型: {getPersonalityType()}
            </span>
          </div>
        )}
      </motion.div>
      
      {/* Results Summary */}
      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">你的傾向分析</h3>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-blue-600">{results.tech}%</span>
                <span className="text-sm text-gray-600">科技傾向</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-purple-600">{results.creative}%</span>
                <span className="text-sm text-gray-600">創意傾向</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-green-600">{results.business}%</span>
                <span className="text-sm text-gray-600">商業傾向</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* View Mode Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-wrap items-center justify-between mb-8"
      >
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('latest')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'latest' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            最新評估 ({savedPaths.filter(p => {
              const latestAssessmentId = savedPaths
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
                ?.assessmentId;
              return p.assessmentId === latestAssessmentId;
            }).length})
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'all' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            所有副本 ({savedPaths.length})
          </button>
          <button
            onClick={() => setViewMode('favorites')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'favorites' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            我的收藏 ({savedPaths.filter(p => p.isFavorite).length})
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {onRetakeAssessment && (
            <motion.button
              onClick={onRetakeAssessment}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span>重新評估</span>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Show only top 3 recommendations when in latest mode and results exist */}
      {viewMode === 'latest' && results && !showGenerateOption ? (
        <>
          {/* Top Recommendations */}
          <div className="grid gap-6 md:gap-8">
            {categorizedPaths.topRecommended.map((path, index) => {
              const CategoryIcon = getCategoryIcon(path.category);
              const categoryColorClass = getCategoryColor(path.category);
              
              return (
                <motion.div
                  key={path.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`
                    relative bg-white rounded-2xl shadow-lg overflow-hidden
                    ${index === 0 ? 'ring-2 ring-purple-500 ring-opacity-50' : ''}
                    ${path.isCustom ? 'border-2 border-purple-200' : ''}
                  `}
                >
                  {/* Path Type Badge */}
                  <div className="absolute top-4 left-4">
                    {path.isCustom ? (
                      <span className="inline-flex items-center space-x-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                        <SparklesIcon className="w-3 h-3" />
                        <span>AI 專屬生成</span>
                      </span>
                    ) : (
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                        官方副本
                      </span>
                    )}
                  </div>

                  {/* Top recommended badge and actions */}
                  <div className="absolute top-4 right-4 flex items-center space-x-2">
                    {index === 0 && !path.isCustom && (
                      <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        🌟 最佳推薦
                      </div>
                    )}
                    
                    {/* Favorite Button */}
                    {onToggleFavorite && (
                      <button
                        onClick={() => onToggleFavorite(path.savedPathId!)}
                        className={`p-2 rounded-full transition-colors ${
                          path.isFavorite 
                            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-500'
                        }`}
                      >
                        {path.isFavorite ? (
                          <HeartIconSolid className="w-4 h-4" />
                        ) : (
                          <HeartIcon className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  
                  <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
                      {/* Path Info */}
                      <div className="flex-1 md:pr-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className={`inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r ${categoryColorClass} rounded-xl`}>
                            <CategoryIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {path.title}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {path.category}
                            </p>
                          </div>
                          {/* Match percentage */}
                          <div className="ml-auto bg-green-100 px-3 py-1 rounded-full">
                            <span className="text-sm font-medium text-green-700">
                              {t('results.matchPercentage', { percentage: path.matchPercentage })}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 mb-4">
                          {path.subtitle}
                        </p>
                        
                        <p className="text-gray-500 mb-4">
                          {path.description}
                        </p>

                        {/* World Setting & Story Context */}
                        {(path as any).worldSetting && (
                          <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                            <h4 className="font-medium text-purple-800 mb-2 flex items-center space-x-2">
                              <GlobeAltIcon className="w-4 h-4" />
                              <span>冒險世界</span>
                            </h4>
                            <p className="text-sm text-purple-700 mb-3">
                              {(path as any).worldSetting}
                            </p>
                            
                            {(path as any).protagonist && (
                              <div className="mb-3">
                                <p className="text-sm font-medium text-purple-800">你的身分：{(path as any).protagonist.name}</p>
                                <p className="text-xs text-purple-600">{(path as any).protagonist.background}</p>
                              </div>
                            )}
                            
                            {(path as any).storyContext?.currentConflict && (
                              <div className="border-l-2 border-purple-300 pl-3">
                                <p className="text-xs text-purple-600">
                                  <span className="font-medium">當前挑戰：</span>
                                  {(path as any).storyContext.currentConflict}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Skills */}
                        <div className="mb-6">
                          <h4 className="font-medium text-gray-900 mb-2">核心技能</h4>
                          <div className="flex flex-wrap gap-2">
                            {path.skills.map((skill: string) => (
                              <span
                                key={skill}
                                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* AI Assistants */}
                        <div className="mb-6">
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                            <UserGroupIcon className="w-4 h-4" />
                            <span>AI 助手團隊</span>
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {path.aiAssistants.map((assistant: string) => (
                              <span
                                key={assistant}
                                className={`bg-gradient-to-r ${categoryColorClass} text-white px-3 py-1 rounded-full text-sm`}
                              >
                                {assistant}
                              </span>
                            ))}
                          </div>
                          
                          {/* Story Characters */}
                          {(path as any).storyContext?.keyCharacters && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs font-medium text-gray-700 mb-2">關鍵角色：</p>
                              <div className="space-y-1">
                                {(path as any).storyContext.keyCharacters.slice(0, 2).map((character: any, index: number) => (
                                  <div key={index} className="text-xs text-gray-600">
                                    <span className="font-medium">{character.name}</span>
                                    <span className="text-gray-500"> - {character.role}</span>
                                  </div>
                                ))}
                                {(path as any).storyContext.keyCharacters.length > 2 && (
                                  <div className="text-xs text-gray-400">
                                    +{(path as any).storyContext.keyCharacters.length - 2} 更多角色...
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Workspace Status Column */}
                      <div className="md:w-64 mt-6 md:mt-0 md:ml-6 md:border-l md:pl-6">
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-3">體驗關卡預覽</h4>
                          <div className="space-y-2">
                            {path.tasks.slice(0, 2).map((task: any) => (
                              <div key={task.id} className="flex items-center space-x-3 text-sm">
                                <ClockIcon className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">{task.title}</span>
                                <span className="text-gray-400">({task.duration})</span>
                              </div>
                            ))}
                            {path.tasks.length > 2 && (
                              <div className="text-sm text-gray-400">
                                +{path.tasks.length - 2} 更多關卡...
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Workspace Info */}
                        {getPathWorkspaces(path.id).length > 0 ? (
                          <div className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">我的冒險基地</h4>
                              <span className="text-sm text-gray-500">
                                {getPathWorkspaces(path.id).length} 個
                              </span>
                            </div>
                            <div className="space-y-2">
                              {getPathWorkspaces(path.id).map(workspace => (
                                <button
                                  key={workspace.id}
                                  onClick={() => onPathSelect(path.id, workspace.id)}
                                  className="w-full text-left p-2 rounded-lg hover:bg-white transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      workspace.status === 'active' ? 'bg-green-100 text-green-700' :
                                      workspace.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                      'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {workspace.status === 'active' ? '探索中' :
                                       workspace.status === 'completed' ? '已完成' : '暫停中'}
                                    </span>
                                    <PlayIcon className="w-4 h-4 text-gray-400" />
                                  </div>
                                  <div className="mt-1 text-xs text-gray-600">
                                    {workspace.completedTasks.length} 個關卡 • {workspace.totalXP} XP
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-xl p-4 text-center">
                            <FolderOpenIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">尚無冒險基地</p>
                            <p className="text-xs text-gray-500 mt-1">開始冒險來創建基地</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                      {/* Main Action Button */}
                      <motion.button
                        onClick={() => onPathSelect(path.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`
                          inline-flex items-center justify-center space-x-2 
                          bg-gradient-to-r ${categoryColorClass} text-white px-6 py-3 rounded-xl 
                          font-medium shadow-lg hover:shadow-xl transition-shadow duration-300
                        `}
                      >
                        <PlusIcon className="w-5 h-5" />
                        <span>開始新的冒險</span>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Not Satisfied Option */}
          {onGenerateCustomPath && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8 text-center p-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl"
            >
              <p className="text-lg text-gray-700 mb-6">
                找不到理想的冒險副本？
              </p>
              <motion.button
                onClick={() => setShowGenerateOption(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow"
              >
                <SparklesIcon className="w-5 h-5" />
                <span>生成專屬副本</span>
              </motion.button>
              <p className="text-sm text-gray-600 mt-4">
                或者
                <button
                  onClick={() => setViewMode('all')}
                  className="text-purple-600 hover:text-purple-700 underline ml-1"
                >
                  查看所有副本
                </button>
              </p>
            </motion.div>
          )}
        </>
      ) : showGenerateOption && onGenerateCustomPath ? (
        /* AI Generation Interface */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
            <SparklesIcon className="w-6 h-6 text-purple-600" />
            <span>讓我們創造專屬於你的冒險</span>
          </h3>
          
          {/* Quick Options */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setSelectedPreference('tech_focused')}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedPreference === 'tech_focused'
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl mb-2 block">🎯</span>
              <p className="font-medium">更專注技術</p>
              <p className="text-sm text-gray-600">深入技術領域的挑戰</p>
            </button>
            
            <button
              onClick={() => setSelectedPreference('creative_focused')}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedPreference === 'creative_focused'
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl mb-2 block">🎨</span>
              <p className="font-medium">更多創意</p>
              <p className="text-sm text-gray-600">釋放創意潛能</p>
            </button>
            
            <button
              onClick={() => setSelectedPreference('business_focused')}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedPreference === 'business_focused'
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl mb-2 block">📊</span>
              <p className="font-medium">商業導向</p>
              <p className="text-sm text-gray-600">培養商業思維</p>
            </button>
            
            <button
              onClick={() => setSelectedPreference('hybrid')}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedPreference === 'hybrid'
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl mb-2 block">🌟</span>
              <p className="font-medium">跨領域整合</p>
              <p className="text-sm text-gray-600">多元技能發展</p>
            </button>
          </div>
          
          {/* Custom Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              描述你理想的職涯冒險（選填）
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="例如：我想成為遊戲開發者，希望學習 Unity 和創意設計..."
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              rows={3}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowGenerateOption(false)}
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              返回
            </button>
            
            <button
              onClick={handleGenerateCustomPath}
              disabled={isGenerating || (!selectedPreference && !customPrompt)}
              className={`inline-flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
                isGenerating || (!selectedPreference && !customPrompt)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg'
              }`}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  <span>開始生成</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      ) : (
        /* Show all paths in other modes */
        <div className="grid gap-6 md:gap-8">
          {displayPaths.map((path, index) => {
            const CategoryIcon = getCategoryIcon(path.category);
            const categoryColorClass = getCategoryColor(path.category);
            
            return (
              <motion.div
                key={path.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`
                  relative bg-white rounded-2xl shadow-lg overflow-hidden
                  ${index === 0 ? 'ring-2 ring-purple-500 ring-opacity-50' : ''}
                  ${path.isCustom ? 'border-2 border-purple-200' : ''}
                `}
              >
                {/* Path Type Badge */}
                <div className="absolute top-4 left-4">
                  {path.isCustom ? (
                    <span className="inline-flex items-center space-x-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                      <SparklesIcon className="w-3 h-3" />
                      <span>AI 專屬生成</span>
                    </span>
                  ) : (
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                      官方副本
                    </span>
                  )}
                </div>

                {/* Top recommended badge and actions */}
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                  {index === 0 && viewMode === 'latest' && !path.isCustom && (
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      🌟 最佳推薦
                    </div>
                  )}
                  
                  {/* Favorite Button */}
                  {onToggleFavorite && (
                    <button
                      onClick={() => onToggleFavorite(path.savedPathId!)}
                      className={`p-2 rounded-full transition-colors ${
                        path.isFavorite 
                          ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-500'
                      }`}
                    >
                      {path.isFavorite ? (
                        <HeartIconSolid className="w-4 h-4" />
                      ) : (
                        <HeartIcon className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  
                  {/* Delete Button */}
                  {onDeletePath && viewMode !== 'latest' && (
                    <button
                      onClick={() => onDeletePath(path.savedPathId!)}
                      className="p-2 rounded-full bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
                    {/* Path Info */}
                    <div className="flex-1 md:pr-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className={`inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r ${categoryColorClass} rounded-xl`}>
                          <CategoryIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {path.title}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {path.category}
                          </p>
                        </div>
                        {/* Match percentage */}
                        {path.matchPercentage && (
                          <div className="ml-auto bg-green-100 px-3 py-1 rounded-full">
                            <span className="text-sm font-medium text-green-700">
                              {t('results.matchPercentage', { percentage: path.matchPercentage })}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-4">
                        {path.subtitle}
                      </p>
                      
                      <p className="text-gray-500 mb-4">
                        {path.description}
                      </p>

                      {/* World Setting & Story Context */}
                      {(path as any).worldSetting && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                          <h4 className="font-medium text-purple-800 mb-2 flex items-center space-x-2">
                            <GlobeAltIcon className="w-4 h-4" />
                            <span>冒險世界</span>
                          </h4>
                          <p className="text-sm text-purple-700 mb-3">
                            {(path as any).worldSetting}
                          </p>
                          
                          {(path as any).protagonist && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-purple-800">你的身分：{(path as any).protagonist.name}</p>
                              <p className="text-xs text-purple-600">{(path as any).protagonist.background}</p>
                            </div>
                          )}
                          
                          {(path as any).storyContext?.currentConflict && (
                            <div className="border-l-2 border-purple-300 pl-3">
                              <p className="text-xs text-purple-600">
                                <span className="font-medium">當前挑戰：</span>
                                {(path as any).storyContext.currentConflict}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Skills */}
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-2">核心技能</h4>
                        <div className="flex flex-wrap gap-2">
                          {path.skills.map((skill: string) => (
                            <span
                              key={skill}
                              className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* AI Assistants */}
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                          <UserGroupIcon className="w-4 h-4" />
                          <span>AI 助手團隊</span>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {path.aiAssistants.map((assistant: string) => (
                            <span
                              key={assistant}
                              className={`bg-gradient-to-r ${categoryColorClass} text-white px-3 py-1 rounded-full text-sm`}
                            >
                              {assistant}
                            </span>
                          ))}
                        </div>
                        
                        {/* Story Characters */}
                        {(path as any).storyContext?.keyCharacters && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs font-medium text-gray-700 mb-2">關鍵角色：</p>
                            <div className="space-y-1">
                              {(path as any).storyContext.keyCharacters.slice(0, 2).map((character: any, index: number) => (
                                <div key={index} className="text-xs text-gray-600">
                                  <span className="font-medium">{character.name}</span>
                                  <span className="text-gray-500"> - {character.role}</span>
                                </div>
                              ))}
                              {(path as any).storyContext.keyCharacters.length > 2 && (
                                <div className="text-xs text-gray-400">
                                  +{(path as any).storyContext.keyCharacters.length - 2} 更多角色...
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Workspace Status Column */}
                    <div className="md:w-64 mt-6 md:mt-0 md:ml-6 md:border-l md:pl-6">
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-3">體驗關卡預覽</h4>
                        <div className="space-y-2">
                          {path.tasks.slice(0, 2).map((task: any) => (
                            <div key={task.id} className="flex items-center space-x-3 text-sm">
                              <ClockIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">{task.title}</span>
                              <span className="text-gray-400">({task.duration})</span>
                            </div>
                          ))}
                          {path.tasks.length > 2 && (
                            <div className="text-sm text-gray-400">
                              +{path.tasks.length - 2} 更多關卡...
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Workspace Info */}
                      {getPathWorkspaces(path.id).length > 0 ? (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">我的冒險基地</h4>
                            <span className="text-sm text-gray-500">
                              {getPathWorkspaces(path.id).length} 個
                            </span>
                          </div>
                          <div className="space-y-2">
                            {getPathWorkspaces(path.id).map(workspace => (
                              <button
                                key={workspace.id}
                                onClick={() => onPathSelect(path.id, workspace.id)}
                                className="w-full text-left p-2 rounded-lg hover:bg-white transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    workspace.status === 'active' ? 'bg-green-100 text-green-700' :
                                    workspace.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {workspace.status === 'active' ? '探索中' :
                                     workspace.status === 'completed' ? '已完成' : '暫停中'}
                                  </span>
                                  <PlayIcon className="w-4 h-4 text-gray-400" />
                                </div>
                                <div className="mt-1 text-xs text-gray-600">
                                  {workspace.completedTasks.length} 個關卡 • {workspace.totalXP} XP
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                          <FolderOpenIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">尚無冒險基地</p>
                          <p className="text-xs text-gray-500 mt-1">開始冒險來創建基地</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    {/* Main Action Button */}
                    <motion.button
                      onClick={() => onPathSelect(path.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        inline-flex items-center justify-center space-x-2 
                        bg-gradient-to-r ${categoryColorClass} text-white px-6 py-3 rounded-xl 
                        font-medium shadow-lg hover:shadow-xl transition-shadow duration-300
                      `}
                    >
                      <PlusIcon className="w-5 h-5" />
                      <span>開始新的冒險</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Statistics for saved paths */}
      {!results && savedPaths.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4">冒險統計</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{savedPaths.length}</div>
              <div className="text-sm text-gray-600">發現的副本</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{savedPaths.filter(p => p.isFavorite).length}</div>
              <div className="text-sm text-gray-600">收藏的副本</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{workspaceSessions.length}</div>
              <div className="text-sm text-gray-600">創建的基地</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}