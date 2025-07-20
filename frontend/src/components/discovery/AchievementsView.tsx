'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  TrophyIcon,
  SparklesIcon,
  CpuChipIcon,
  PuzzlePieceIcon,
  GlobeAltIcon,
  AcademicCapIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import {
  TrophyIcon as TrophyIconSolid,
  SparklesIcon as SparklesIconSolid,
  CpuChipIcon as CpuChipIconSolid,
  PuzzlePieceIcon as PuzzlePieceIconSolid,
  GlobeAltIcon as GlobeAltIconSolid
} from '@heroicons/react/24/solid';

// Import types from the unified service
import type { UserAchievements } from '@/lib/services/user-data-service';

interface AchievementsViewProps {
  achievements: UserAchievements;
}

interface BadgeData {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconSolid: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

export default function AchievementsView({ achievements }: AchievementsViewProps) {
  const { t } = useTranslation('discovery');

  // Define available badges
  const allBadges: BadgeData[] = [
    {
      id: 'first_task',
      title: t('achievements.badges.first_task.title'),
      description: t('achievements.badges.first_task.description'),
      icon: AcademicCapIcon,
      iconSolid: TrophyIconSolid,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      id: 'creative_thinker',
      title: t('achievements.badges.creative_thinker.title'),
      description: t('achievements.badges.creative_thinker.description'),
      icon: SparklesIcon,
      iconSolid: SparklesIconSolid,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      id: 'ai_collaborator',
      title: t('achievements.badges.ai_collaborator.title'),
      description: t('achievements.badges.ai_collaborator.description'),
      icon: CpuChipIcon,
      iconSolid: CpuChipIconSolid,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      id: 'problem_solver',
      title: t('achievements.badges.problem_solver.title'),
      description: t('achievements.badges.problem_solver.description'),
      icon: PuzzlePieceIcon,
      iconSolid: PuzzlePieceIconSolid,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      id: 'path_explorer',
      title: t('achievements.badges.path_explorer.title'),
      description: t('achievements.badges.path_explorer.description'),
      icon: GlobeAltIcon,
      iconSolid: GlobeAltIconSolid,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    }
  ];

  // Calculate next level XP requirement
  const nextLevelXp = achievements.level * 100;
  const currentLevelXp = achievements.totalXp - ((achievements.level - 1) * 100);
  const progressToNextLevel = (currentLevelXp / 100) * 100;

  // Get level benefits
  const getLevelBenefits = (level: number): string[] => {
    const benefits: string[] = [];
    if (level >= 2) benefits.push('解鎖進階任務');
    if (level >= 3) benefits.push('獲得專屬稱號');
    if (level >= 5) benefits.push('解鎖特殊成就');
    if (level >= 10) benefits.push('探索大師認證');
    return benefits;
  };

  const earnedBadgeIds = achievements.badges.map(b => b.id);
  const earnedBadges = allBadges.filter(badge => earnedBadgeIds.includes(badge.id));
  const availableBadges = allBadges.filter(badge => !earnedBadgeIds.includes(badge.id));

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-4">
          <TrophyIconSolid className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {t('achievements.title')}
        </h2>
        <p className="text-lg text-gray-600">
          追蹤你的學習成就和技能發展
        </p>
      </motion.div>

      {/* Level and XP Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl p-6 text-white mb-8"
      >
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">
              {t('achievements.level', { level: achievements.level })}
            </div>
            <div className="text-purple-100">目前等級</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">
              {achievements.totalXp}
            </div>
            <div className="text-purple-100">總經驗值</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">
              {earnedBadges.length}
            </div>
            <div className="text-purple-100">已獲得徽章</div>
          </div>
        </div>
        
        {/* Level Progress */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-purple-100 mb-2">
            <span>下一等級進度</span>
            <span>{Math.round(progressToNextLevel)}%</span>
          </div>
          <div className="w-full bg-purple-400 bg-opacity-30 rounded-full h-2">
            <motion.div
              className="bg-white h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressToNextLevel}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
          <div className="text-sm text-purple-100 mt-2">
            還需要 {nextLevelXp - achievements.totalXp} XP 升級到等級 {achievements.level + 1}
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Earned Badges */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <StarIcon className="w-5 h-5 text-yellow-500" />
            <span>已獲得徽章</span>
          </h3>
          
          {earnedBadges.length > 0 ? (
            <div className="space-y-4">
              {earnedBadges.map((badge, index) => {
                const IconSolid = badge.iconSolid;
                
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    className="bg-white rounded-xl p-4 shadow-lg border border-gray-100"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 ${badge.bgColor} rounded-xl flex items-center justify-center`}>
                        <IconSolid className={`w-6 h-6 ${badge.color}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{badge.title}</h4>
                        <p className="text-sm text-gray-600">{badge.description}</p>
                      </div>
                      <div className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-medium">
                        已獲得
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <TrophyIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">還沒有獲得任何徽章</p>
              <p className="text-sm text-gray-500 mt-1">完成任務來獲得你的第一個徽章！</p>
            </div>
          )}
        </motion.div>

        {/* Available Badges */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <TrophyIcon className="w-5 h-5 text-gray-400" />
            <span>可獲得徽章</span>
          </h3>
          
          <div className="space-y-4">
            {availableBadges.map((badge, index) => {
              const Icon = badge.icon;
              
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  className="bg-white rounded-xl p-4 shadow-lg border border-gray-100 opacity-60"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Icon className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-700">{badge.title}</h4>
                      <p className="text-sm text-gray-500">{badge.description}</p>
                    </div>
                    <div className="bg-gray-100 text-gray-500 px-2 py-1 rounded-full text-xs font-medium">
                      待獲得
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Level Benefits */}
      {achievements.level > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">等級特權</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {getLevelBenefits(achievements.level).map((benefit, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-8 bg-white rounded-2xl shadow-lg p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">學習統計</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{achievements.completedTasks.length}</div>
            <div className="text-sm text-gray-600">已完成任務</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{earnedBadges.length}</div>
            <div className="text-sm text-gray-600">獲得徽章</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{achievements.level}</div>
            <div className="text-sm text-gray-600">目前等級</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{Math.floor(achievements.totalXp / 50)}</div>
            <div className="text-sm text-gray-600">學習時數</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}