'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AcademicCapIcon, 
  GlobeAltIcon,
  ChartBarIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  SparklesIcon,
  TrophyIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

// Components
import WelcomeScreen from '@/components/discovery/WelcomeScreen';
import InterestAssessment from '@/components/discovery/InterestAssessment';
import PathResults from '@/components/discovery/PathResults';
import ExplorationWorkspace from '@/components/discovery/ExplorationWorkspace';
import AchievementsView from '@/components/discovery/AchievementsView';

// Types
interface AssessmentResults {
  tech: number;
  creative: number;
  business: number;
}

interface UserAchievements {
  badges: string[];
  totalXp: number;
  level: number;
  completedTasks: string[];
}

type ViewState = 'welcome' | 'assessment' | 'results' | 'workspace' | 'achievements';

export default function DiscoveryPage() {
  const { t } = useTranslation(['discovery', 'navigation']);
  const [currentView, setCurrentView] = useState<ViewState>('welcome');
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResults | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<UserAchievements>({
    badges: [],
    totalXp: 0,
    level: 1,
    completedTasks: []
  });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showSideNav, setShowSideNav] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  // Load user data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('discoveryData');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        if (data.assessmentResults) setAssessmentResults(data.assessmentResults);
        if (data.achievements) setAchievements(data.achievements);
        if (data.currentView) setCurrentView(data.currentView);
      } catch (error) {
        console.error('Failed to load saved data:', error);
      }
    }
  }, []);

  // Save user data to localStorage
  useEffect(() => {
    const dataToSave = {
      assessmentResults,
      achievements,
      currentView: currentView !== 'workspace' ? currentView : 'results'
    };
    localStorage.setItem('discoveryData', JSON.stringify(dataToSave));
  }, [assessmentResults, achievements, currentView]);

  // Handle scroll for progress tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      setShowSideNav(scrolled > 200);
      
      const winScroll = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolledProgress = (winScroll / height) * 100;
      setScrollProgress(scrolledProgress);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAssessmentComplete = (results: AssessmentResults) => {
    setAssessmentResults(results);
    setCurrentView('results');
    
    // Award first assessment badge
    if (!achievements.badges.includes('first_assessment')) {
      setAchievements(prev => ({
        ...prev,
        badges: [...prev.badges, 'first_assessment'],
        totalXp: prev.totalXp + 50,
        level: Math.floor((prev.totalXp + 50) / 100) + 1
      }));
    }
  };

  const handlePathSelect = (pathId: string) => {
    setSelectedPath(pathId);
    setCurrentView('workspace');
  };

  const handleTaskComplete = (taskId: string, xpGained: number, _skillsGained: string[]) => {
    setAchievements(prev => {
      const newAchievements = { ...prev };
      
      // Add XP and update level
      newAchievements.totalXp += xpGained;
      newAchievements.level = Math.floor(newAchievements.totalXp / 100) + 1;
      
      // Mark task as completed
      if (!newAchievements.completedTasks.includes(taskId)) {
        newAchievements.completedTasks.push(taskId);
      }
      
      // Award badges based on achievements
      const totalTasks = newAchievements.completedTasks.length;
      
      if (totalTasks >= 1 && !newAchievements.badges.includes('first_task')) {
        newAchievements.badges.push('first_task');
      }
      
      if (totalTasks >= 3 && !newAchievements.badges.includes('problem_solver')) {
        newAchievements.badges.push('problem_solver');
      }
      
      if (totalTasks >= 5 && !newAchievements.badges.includes('ai_collaborator')) {
        newAchievements.badges.push('ai_collaborator');
      }
      
      return newAchievements;
    });
  };

  const navigationItems = [
    {
      id: 'overview',
      label: t('navigation.overview'),
      icon: AcademicCapIcon,
      view: 'welcome' as ViewState
    },
    {
      id: 'assessment',
      label: t('navigation.assessment'),
      icon: ChartBarIcon,
      view: 'assessment' as ViewState
    },
    {
      id: 'paths',
      label: t('navigation.paths'),
      icon: GlobeAltIcon,
      view: 'results' as ViewState,
      disabled: !assessmentResults
    },
    {
      id: 'achievements',
      label: t('navigation.achievements'),
      icon: TrophyIcon,
      view: 'achievements' as ViewState
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Desktop: Floating Side Navigation */}
      <div className={`
        hidden lg:block fixed left-8 top-1/2 -translate-y-1/2 z-50
        transition-all duration-500
        ${showSideNav ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'}
      `}>
        {/* Vertical Progress Bar */}
        <div className="relative">
          <div className="absolute left-0 top-0 w-1 h-40 bg-gray-200 rounded-full" />
          <div 
            className="absolute left-0 top-0 w-1 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full transition-all duration-300"
            style={{ height: `${Math.min(scrollProgress * 1.6, 160)}px` }}
          />
          
          {/* Navigation Points */}
          <div className="relative -ml-3 h-40">
            {navigationItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = currentView === item.view;
              const position = (index / (navigationItems.length - 1)) * 100;
              
              return (
                <button
                  key={item.id}
                  onClick={() => !item.disabled && setCurrentView(item.view)}
                  disabled={item.disabled}
                  className={`
                    absolute group
                    ${isActive ? 'scale-110' : 'scale-100'}
                    ${item.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  style={{ top: `${position}%`, transform: `translateY(-50%)` }}
                >
                  {/* Circle Button */}
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    transition-all duration-300 shadow-lg
                    ${isActive 
                      ? 'bg-purple-600 text-white' 
                      : item.disabled
                      ? 'bg-gray-200 text-gray-400'
                      : 'bg-white text-gray-600 hover:bg-purple-100'
                    }
                  `}>
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  {/* Hover Label */}
                  <div className={`
                    absolute left-12 top-1/2 -translate-y-1/2 
                    opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                    ${item.disabled ? 'hidden' : ''}
                  `}>
                    <div className="bg-gray-900 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap">
                      {item.label}
                      {item.id === 'achievements' && achievements.badges.length > 0 && (
                        <span className="ml-2 text-yellow-400">({achievements.badges.length})</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Achievement Summary */}
        {achievements.totalXp > 0 && (
          <div className="mt-8 bg-white/90 backdrop-blur rounded-lg shadow-lg p-4 w-48">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">等級</span>
                <span className="font-bold text-purple-600">Lv.{achievements.level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">經驗值</span>
                <span className="font-bold text-blue-600">{achievements.totalXp} XP</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(achievements.totalXp % 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Right Side Quick Actions */}
      <div className={`
        hidden lg:block fixed right-8 bottom-8 z-50
        transition-all duration-500
        ${showSideNav ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}
      `}>
        {/* Scroll to Top */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors group"
          aria-label="回到頂部"
        >
          <ArrowUpIcon className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
        </button>
      </div>

      {/* Mobile: Floating Progress Circle */}
      <div className={`
        lg:hidden fixed bottom-20 right-4 z-50
        transition-all duration-500
        ${showSideNav ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
      `}>
        {/* Circle Progress Indicator */}
        <div className="relative w-16 h-16">
          {/* Background Circle */}
          <svg className="w-16 h-16 transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="#e5e7eb"
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="url(#gradient)"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - scrollProgress / 100)}`}
              className="transition-all duration-300"
            />
            <defs>
              <linearGradient id="gradient">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Center Content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => setShowMobileNav(!showMobileNav)}
              className="w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center"
            >
              <span className="text-xs font-bold text-purple-600">
                {Math.round(scrollProgress)}%
              </span>
            </button>
          </div>
        </div>
        
        {/* Expanded Quick Navigation */}
        <AnimatePresence>
          {showMobileNav && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute bottom-full right-0 mb-4 bg-white rounded-2xl shadow-xl p-2 min-w-[200px]"
            >
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.view;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (!item.disabled) {
                        setCurrentView(item.view);
                        setShowMobileNav(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    disabled={item.disabled}
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
                      ${isActive 
                        ? 'bg-purple-100 text-purple-700' 
                        : item.disabled
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'hover:bg-gray-50 text-gray-700'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.id === 'achievements' && achievements.badges.length > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {achievements.badges.length}
                      </span>
                    )}
                  </button>
                );
              })}
              
              {/* Mobile Progress Info */}
              <div className="border-t border-gray-100 mt-2 pt-2 px-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">進度</span>
                  <span className="font-medium text-purple-600">
                    Lv.{achievements.level} • {achievements.totalXp} XP
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile: Bottom Mini Status Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 px-4 py-2 z-40">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 font-medium">
            {currentView === 'welcome' && '🎮 歡迎畫面'}
            {currentView === 'assessment' && '📊 能力評估'}
            {currentView === 'results' && '🌍 探索路徑'}
            {currentView === 'workspace' && '🚀 探索空間'}
            {currentView === 'achievements' && '🏆 成就系統'}
          </span>
          <div className="flex items-center space-x-3">
            <span className="font-medium text-purple-600">Lv.{achievements.level}</span>
            <div className="w-px h-3 bg-gray-300" />
            <span className="font-medium text-blue-600">{achievements.totalXp} XP</span>
          </div>
        </div>
      </div>
      {/* Page Header - Non-sticky, simple breadcrumb */}
      {currentView !== 'workspace' && (
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <button 
                onClick={() => window.location.href = '/'}
                className="hover:text-gray-700 transition-colors"
              >
                {t('navigation:home')}
              </button>
              <span>/</span>
              <span className="text-gray-900 font-medium">{t('title')}</span>
            </nav>
            
            {/* Title and Quick Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <SparklesIcon className="w-8 h-8 text-purple-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                  <p className="text-sm text-gray-600 mt-1">{t('subtitle')}</p>
                </div>
              </div>
              
              {/* Desktop: Inline navigation buttons */}
              <div className="hidden sm:flex items-center space-x-3">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.view;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => !item.disabled && setCurrentView(item.view)}
                      disabled={item.disabled}
                      className={`
                        flex items-center space-x-2 px-4 py-2 rounded-lg transition-all font-medium text-sm
                        ${isActive 
                          ? 'bg-purple-600 text-white shadow-md' 
                          : item.disabled
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                      {item.id === 'achievements' && achievements.badges.length > 0 && (
                        <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {achievements.badges.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Mobile: Dropdown selector */}
              <div className="sm:hidden">
                <select 
                  value={currentView}
                  onChange={(e) => setCurrentView(e.target.value as ViewState)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {navigationItems.map((item) => (
                    <option 
                      key={item.id} 
                      value={item.view}
                      disabled={item.disabled}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Achievement Progress Bar */}
            {achievements.totalXp > 0 && (
              <div className="mt-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <TrophyIcon className="w-5 h-5 text-purple-600" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        Level {achievements.level}
                      </span>
                      <span className="text-sm text-gray-600 ml-2">
                        {achievements.totalXp} XP
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-purple-600 font-medium">
                    {achievements.badges.length} 個徽章
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(achievements.totalXp % 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workspace Header - Simplified */}
      {currentView === 'workspace' && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setCurrentView('results')}
                  className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="返回路徑列表"
                >
                  <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {selectedPath && t('workspace.title', { path: selectedPath })}
                  </h1>
                  <p className="text-sm text-gray-600">{t('workspace.subtitle')}</p>
                </div>
              </div>
              
              {/* Compact progress display */}
              <div className="hidden sm:flex items-center space-x-3 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">Level</span>
                  <span className="font-bold text-purple-600">{achievements.level}</span>
                </div>
                <div className="h-4 w-px bg-gray-300" />
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">XP</span>
                  <span className="font-bold text-blue-600">{achievements.totalXp}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Add padding for mobile status bar */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 lg:pb-8">
        <AnimatePresence mode="wait">
          {currentView === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <WelcomeScreen onStartJourney={() => setCurrentView('assessment')} />
            </motion.div>
          )}

          {currentView === 'assessment' && (
            <motion.div
              key="assessment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <InterestAssessment onComplete={handleAssessmentComplete} />
            </motion.div>
          )}

          {currentView === 'results' && assessmentResults && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <PathResults 
                results={assessmentResults} 
                onPathSelect={handlePathSelect}
              />
            </motion.div>
          )}

          {currentView === 'workspace' && selectedPath && (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ExplorationWorkspace 
                pathId={selectedPath}
                achievements={achievements}
                onTaskComplete={handleTaskComplete}
                onBackToPaths={() => setCurrentView('results')}
              />
            </motion.div>
          )}

          {currentView === 'achievements' && (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <AchievementsView achievements={achievements} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

    </div>
  );
}