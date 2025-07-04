'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AcademicCapIcon, 
  BriefcaseIcon,
  ChartBarIcon,
  ArrowLeftIcon,
  SparklesIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

// Components
import WelcomeScreen from '@/components/career-discovery/WelcomeScreen';
import InterestAssessment from '@/components/career-discovery/InterestAssessment';
import CareerResults from '@/components/career-discovery/CareerResults';
import CareerWorkspace from '@/components/career-discovery/CareerWorkspace';
import AchievementsView from '@/components/career-discovery/AchievementsView';

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

export default function CareerDiscoveryPage() {
  const { t } = useTranslation(['careerDiscovery', 'navigation']);
  const [currentView, setCurrentView] = useState<ViewState>('welcome');
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResults | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<UserAchievements>({
    badges: [],
    totalXp: 0,
    level: 1,
    completedTasks: []
  });

  // Load user data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('careerDiscoveryData');
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
    localStorage.setItem('careerDiscoveryData', JSON.stringify(dataToSave));
  }, [assessmentResults, achievements, currentView]);

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

  const handleCareerSelect = (careerId: string) => {
    setSelectedCareer(careerId);
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
      id: 'careers',
      label: t('navigation.careers'),
      icon: BriefcaseIcon,
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
      {/* Combined Header and Navigation */}
      {currentView !== 'workspace' && (
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-16 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left side - Back button and title */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => window.history.back()}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span className="font-medium hidden sm:inline">{t('backToHome')}</span>
                </button>
                <div className="h-6 w-px bg-gray-300" />
                <h1 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                  <SparklesIcon className="w-6 h-6 text-purple-600" />
                  <span className="hidden md:inline">{t('title')}</span>
                  <span className="md:hidden">職業探索</span>
                </h1>
              </div>

              {/* Center - Navigation tabs */}
              <nav className="flex space-x-6 lg:space-x-8">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.view;
                  const isDisabled = item.disabled;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => !isDisabled && setCurrentView(item.view)}
                      disabled={isDisabled}
                      className={`
                        group flex items-center space-x-2 py-4 border-b-2 transition-all duration-200 relative
                        ${isActive 
                          ? 'border-purple-500 text-purple-600' 
                          : isDisabled
                          ? 'border-transparent text-gray-400 cursor-not-allowed'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium hidden sm:inline">{item.label}</span>
                      
                      {/* Mobile tooltip */}
                      <span className="sm:hidden absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {item.label}
                      </span>
                      
                      {item.id === 'achievements' && achievements.badges.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {achievements.badges.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
              
              {/* Right side - Level and XP Display */}
              {achievements.totalXp > 0 && (
                <div className="flex items-center space-x-2 lg:space-x-4">
                  <div className="bg-purple-100 px-2 lg:px-3 py-1 rounded-full">
                    <span className="text-xs lg:text-sm font-medium text-purple-700">
                      {t('achievements.level', { level: achievements.level })}
                    </span>
                  </div>
                  <div className="bg-yellow-100 px-2 lg:px-3 py-1 rounded-full">
                    <span className="text-xs lg:text-sm font-medium text-yellow-700">
                      {achievements.totalXp} XP
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Workspace Header (when in workspace view) */}
      {currentView === 'workspace' && (
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-16 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentView('results')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span className="font-medium">{t('workspace.backToCareers')}</span>
                </button>
                <div className="h-6 w-px bg-gray-300" />
                <h1 className="text-xl font-bold text-gray-900">
                  {selectedCareer && t('workspace.title', { career: selectedCareer })}
                </h1>
              </div>
              
              {/* Level and XP Display */}
              {achievements.totalXp > 0 && (
                <div className="flex items-center space-x-4">
                  <div className="bg-purple-100 px-3 py-1 rounded-full">
                    <span className="text-sm font-medium text-purple-700">
                      {t('achievements.level', { level: achievements.level })}
                    </span>
                  </div>
                  <div className="bg-yellow-100 px-3 py-1 rounded-full">
                    <span className="text-sm font-medium text-yellow-700">
                      {achievements.totalXp} XP
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <CareerResults 
                results={assessmentResults} 
                onCareerSelect={handleCareerSelect}
              />
            </motion.div>
          )}

          {currentView === 'workspace' && selectedCareer && (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <CareerWorkspace 
                careerId={selectedCareer}
                achievements={achievements}
                onTaskComplete={handleTaskComplete}
                onBackToCareers={() => setCurrentView('results')}
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