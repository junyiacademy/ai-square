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
  UserGroupIcon
} from '@heroicons/react/24/outline';

interface AssessmentResults {
  tech: number;
  creative: number;
  business: number;
}

interface PathResultsProps {
  results: AssessmentResults;
  onPathSelect: (pathId: string) => void;
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

export default function PathResults({ results, onPathSelect }: PathResultsProps) {
  const { t } = useTranslation('discovery');

  // Get path data from translations
  const pathIds = ['youtuber', 'game_designer', 'app_developer'];
  const paths: PathData[] = pathIds.map(id => ({
    id,
    ...(t(`paths.${id}`, { returnObjects: true }) as Omit<PathData, 'id'>)
  }));

  // Calculate match percentages
  const calculateMatchPercentage = (pathId: string): number => {
    const total = results.tech + results.creative + results.business;
    
    switch (pathId) {
      case 'youtuber':
        return Math.round(((results.creative * 2 + results.business) / total) * 100);
      case 'game_designer':
        return Math.round(((results.tech + results.creative * 1.5) / total) * 100);
      case 'app_developer':
        return Math.round(((results.tech * 2 + results.business * 0.5) / total) * 100);
      default:
        return 0;
    }
  };

  // Sort paths by match percentage
  const sortedPaths = paths
    .map(path => ({
      ...path,
      matchPercentage: calculateMatchPercentage(path.id)
    }))
    .sort((a, b) => b.matchPercentage - a.matchPercentage);

  // Get personality type based on highest score
  const getPersonalityType = (): string => {
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

  const getCategoryIcon = (category: string) => {
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

  const getCategoryColor = (category: string) => {
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
          {t('results.title')}
        </h2>
        <p className="text-lg text-gray-600 mb-6">
          {t('results.subtitle')}
        </p>
        
        {/* Personality Type */}
        <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-purple-100 to-blue-100 px-6 py-3 rounded-full">
          <SparklesIcon className="w-5 h-5 text-purple-600" />
          <span className="font-medium text-purple-800">
            {t('results.personalityType')}: {getPersonalityType()}
          </span>
        </div>
      </motion.div>

      {/* Path Cards */}
      <div className="grid gap-6 md:gap-8">
        {sortedPaths.map((path, index) => {
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
              {/* Top recommended badge */}
              {index === 0 && (
                <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  🌟 最佳推薦
                </div>
              )}
              
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
                  {/* Path Info */}
                  <div className="flex-1">
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

                    {/* Sample Tasks */}
                    <div className="mb-6">
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
                  </div>
                </div>

                {/* Action Button */}
                <motion.button
                  onClick={() => onPathSelect(path.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    w-full md:w-auto inline-flex items-center justify-center space-x-2 
                    bg-gradient-to-r ${categoryColorClass} text-white px-6 py-3 rounded-xl 
                    font-medium shadow-lg hover:shadow-xl transition-shadow duration-300
                  `}
                >
                  <PlayIcon className="w-5 h-5" />
                  <span>{t('results.explorePath')}</span>
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Results Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6"
      >
        <h3 className="font-semibold text-gray-900 mb-4">你的傾向分析</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{results.tech}</div>
            <div className="text-sm text-gray-600">科技傾向</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{results.creative}</div>
            <div className="text-sm text-gray-600">創意傾向</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{results.business}</div>
            <div className="text-sm text-gray-600">商業傾向</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}