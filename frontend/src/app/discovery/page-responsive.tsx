'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeftIcon,
  SparklesIcon,
  TrophyIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function CareerDiscoveryPageResponsive() {
  const { t } = useTranslation(['careerDiscovery', 'navigation']);
  const [currentView, setCurrentView] = useState<ViewState>('welcome');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // 監聽滾動，當滾動時縮小導航欄
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 智能響應式導航 */}
      <header className={`
        bg-white/90 backdrop-blur-sm border-b border-gray-200 
        sticky top-16 z-40 transition-all duration-300
        ${isScrolled ? 'py-2' : 'py-4'}
      `}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 桌面版本 */}
          <div className="hidden md:block">
            {/* 完整導航 - 未滾動時顯示 */}
            <div className={`transition-all duration-300 ${isScrolled ? 'hidden' : 'block'}`}>
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => window.history.back()}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  <span className="text-sm">{t('backToHome')}</span>
                </button>
                
                {achievements.totalXp > 0 && (
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-purple-600 font-medium">
                      Level {achievements.level}
                    </span>
                    <span className="text-sm text-gray-500">
                      {achievements.totalXp} XP
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <SparklesIcon className="w-6 h-6 text-purple-600" />
                  <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
                </div>
                
                <nav className="flex space-x-6">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.view;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => !item.disabled && setCurrentView(item.view)}
                        disabled={item.disabled}
                        className={`
                          flex items-center space-x-2 pb-2 border-b-2 transition-all
                          ${isActive 
                            ? 'border-purple-500 text-purple-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
            
            {/* 精簡導航 - 滾動時顯示 */}
            <div className={`transition-all duration-300 ${isScrolled ? 'block' : 'hidden'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <SparklesIcon className="w-5 h-5 text-purple-600" />
                  <h1 className="text-lg font-bold text-gray-900">{t('title')}</h1>
                </div>
                
                <div className="flex items-center space-x-4">
                  {navigationItems.map((item) => {
                    const isActive = currentView === item.view;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => !item.disabled && setCurrentView(item.view)}
                        disabled={item.disabled}
                        className={`
                          px-3 py-1 rounded-full text-sm font-medium transition-all
                          ${isActive 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'text-gray-600 hover:bg-gray-100'
                          }
                        `}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          
          {/* 手機版本 - 單行精簡 */}
          <div className="md:hidden">
            <div className="flex items-center justify-between">
              <button
                onClick={() => window.history.back()}
                className="p-2 -ml-2"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
              </button>
              
              <h1 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <SparklesIcon className="w-5 h-5 text-purple-600" />
                <span>職業探索</span>
              </h1>
              
              <button
                onClick={() => setIsNavOpen(!isNavOpen)}
                className="p-2 -mr-2"
              >
                {isNavOpen ? (
                  <XMarkIcon className="w-5 h-5 text-gray-600" />
                ) : (
                  <Bars3Icon className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
            
            {/* 手機導航選單 */}
            <AnimatePresence>
              {isNavOpen && (
                <motion.nav
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 pb-2 space-y-1">
                    {navigationItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentView === item.view;
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (!item.disabled) {
                              setCurrentView(item.view);
                              setIsNavOpen(false);
                            }
                          }}
                          disabled={item.disabled}
                          className={`
                            w-full flex items-center space-x-3 px-2 py-2 rounded-lg
                            ${isActive 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'text-gray-600 hover:bg-gray-50'
                            }
                          `}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="font-medium">{item.label}</span>
                          {item.id === 'achievements' && achievements.badges.length > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                              {achievements.badges.length}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    
                    {achievements.totalXp > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between px-2 py-1">
                          <span className="text-sm text-gray-600">進度</span>
                          <span className="text-sm font-medium text-purple-600">
                            Level {achievements.level} • {achievements.totalXp} XP
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.nav>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* 主要內容區域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 內容保持不變 */}
      </main>
    </div>
  );
}