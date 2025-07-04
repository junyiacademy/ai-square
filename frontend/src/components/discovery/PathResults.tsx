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

interface PathResultsProps {
  results: AssessmentResults | null;
  onPathSelect: (pathId: string, workspaceId?: string) => void;
  workspaceSessions?: WorkspaceSession[];
  savedPaths?: SavedPathData[];
  onToggleFavorite?: (pathId: string) => void;
  onDeletePath?: (pathId: string) => void;
  onRetakeAssessment?: () => void;
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
}

export default function PathResults({ 
  results, 
  onPathSelect, 
  workspaceSessions = [], 
  savedPaths = [],
  onToggleFavorite,
  onDeletePath,
  onRetakeAssessment
}: PathResultsProps) {
  const { t } = useTranslation('discovery');
  const [viewMode, setViewMode] = React.useState<'latest' | 'all' | 'favorites'>('latest');

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
        // Try to get path data from careers section in translations
        const pathData = t(`careers.${savedPath.pathData.id}`, { returnObjects: true, defaultValue: null });
        
        // If translation not found, return a default structure
        if (!pathData || typeof pathData !== 'object') {
          return {
            id: savedPath.pathData.id,
            title: savedPath.pathData.id,
            subtitle: '',
            description: '',
            category: 'technology',
            skills: [],
            aiAssistants: [],
            tasks: [],
            savedPathId: savedPath.id,
            matchPercentage: savedPath.matchPercentage,
            isFavorite: savedPath.isFavorite,
            createdAt: savedPath.createdAt,
            assessmentId: savedPath.assessmentId
          };
        }
        
        return {
          ...pathData,
          id: savedPath.pathData.id,
          savedPathId: savedPath.id,
          matchPercentage: savedPath.matchPercentage,
          isFavorite: savedPath.isFavorite,
          createdAt: savedPath.createdAt,
          assessmentId: savedPath.assessmentId
        };
      })
      .sort((a, b) => b.matchPercentage - a.matchPercentage);
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

  // Format date to relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '剛剛';
    if (diffInHours < 24) return `${diffInHours} 小時前`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} 天前`;
    return date.toLocaleDateString('zh-TW');
  };

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
            還沒有任何探索路徑
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            完成興趣評估來發現適合你的學習路徑，開始你的個人化探索之旅！
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
          你的探索路徑
        </h2>
        <p className="text-lg text-gray-600 mb-6">
          基於你的興趣評估結果，為你推薦合適的學習路徑
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
      
      {/* Results Summary - Moved here */}
      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4"
        >
          <h3 className="text-sm font-semibold text-gray-900 mb-3">你的傾向分析</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">{results.tech}%</div>
              <div className="text-xs text-gray-600">科技傾向</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">{results.creative}%</div>
              <div className="text-xs text-gray-600">創意傾向</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{results.business}%</div>
              <div className="text-xs text-gray-600">商業傾向</div>
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
            所有路徑 ({savedPaths.length})
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

      {/* Path Cards */}
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
              `}
            >
              {/* Top recommended badge and actions */}
              <div className="absolute top-4 right-4 flex items-center space-x-2">
                {index === 0 && viewMode === 'latest' && (
                  <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    🌟 最佳推薦
                  </div>
                )}
                
                {/* Favorite Button */}
                {onToggleFavorite && (
                  <button
                    onClick={() => onToggleFavorite(path.savedPathId)}
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
                    onClick={() => onDeletePath(path.savedPathId)}
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
                      <div className="ml-auto bg-green-100 px-3 py-1 rounded-full">
                        <span className="text-sm font-medium text-green-700">
                          {t('results.matchPercentage', { percentage: path.matchPercentage })}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4">
                      {path.subtitle}
                    </p>
                    
                    <p className="text-gray-500 mb-6">
                      {path.description}
                    </p>

                    {/* Skills */}
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-2">核心技能</h4>
                      <div className="flex flex-wrap gap-2">
                        {path.skills.map((skill) => (
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
                        {path.aiAssistants.map((assistant) => (
                          <span
                            key={assistant}
                            className={`bg-gradient-to-r ${categoryColorClass} text-white px-3 py-1 rounded-full text-sm`}
                          >
                            {assistant}
                          </span>
                        ))}
                      </div>
                    </div>

                  </div>
                  
                  {/* Workspace Status Column */}
                  <div className="md:w-64 mt-6 md:mt-0 md:ml-6 md:border-l md:pl-6">
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-3">體驗任務預覽</h4>
                      <div className="space-y-2">
                        {path.tasks.slice(0, 2).map((task) => (
                          <div key={task.id} className="flex items-center space-x-3 text-sm">
                            <ClockIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">{task.title}</span>
                            <span className="text-gray-400">({task.duration})</span>
                          </div>
                        ))}
                        {path.tasks.length > 2 && (
                          <div className="text-sm text-gray-400">
                            +{path.tasks.length - 2} 更多任務...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Workspace Info */}
                    {getPathWorkspaces(path.id).length > 0 ? (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">我的工作區</h4>
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
                                  {workspace.status === 'active' ? '進行中' :
                                   workspace.status === 'completed' ? '已完成' : '暫停中'}
                                </span>
                                <PlayIcon className="w-4 h-4 text-gray-400" />
                              </div>
                              <div className="mt-1 text-xs text-gray-600">
                                {workspace.completedTasks.length} 個任務 • {workspace.totalXP} XP
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <FolderOpenIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">尚無工作區</p>
                        <p className="text-xs text-gray-500 mt-1">開始探索來創建工作區</p>
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
                    <span>開始新的探索</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Statistics for saved paths */}
      {!results && savedPaths.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4">探索統計</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{savedPaths.length}</div>
              <div className="text-sm text-gray-600">發現的路徑</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{savedPaths.filter(p => p.isFavorite).length}</div>
              <div className="text-sm text-gray-600">收藏的路徑</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{workspaceSessions.length}</div>
              <div className="text-sm text-gray-600">創建的工作區</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}