'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeftIcon,
  SparklesIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

// ... 其他 imports 和 interfaces 保持不變 ...

export default function CareerDiscoveryPage() {
  const { t } = useTranslation(['careerDiscovery', 'navigation']);
  const [currentView, setCurrentView] = useState<ViewState>('welcome');
  // ... 其他 state 保持不變 ...

  // 方案一：移除子導航，改用麵包屑 + 行動按鈕
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 簡化的頂部區域 - 非 sticky，使用麵包屑 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* 麵包屑導航 */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-3">
            <button 
              onClick={() => window.history.back()}
              className="hover:text-gray-700 transition-colors"
            >
              首頁
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">職業探索世界</span>
          </nav>
          
          {/* 標題與行動按鈕 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SparklesIcon className="w-8 h-8 text-purple-600" />
              <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            </div>
            
            {/* 桌面版：標籤式導航 */}
            <div className="hidden md:flex items-center space-x-4">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.view;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => !item.disabled && setCurrentView(item.view)}
                    disabled={item.disabled}
                    className={`
                      flex items-center space-x-2 px-4 py-2 rounded-lg transition-all
                      ${isActive 
                        ? 'bg-purple-100 text-purple-700' 
                        : item.disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
            
            {/* 手機版：下拉選單 */}
            <div className="md:hidden relative">
              <select 
                value={currentView}
                onChange={(e) => setCurrentView(e.target.value as ViewState)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* 成就顯示條 */}
          {achievements.totalXp > 0 && (
            <div className="mt-4 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <TrophyIcon className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">
                    Level {achievements.level}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {achievements.totalXp} XP • {achievements.badges.length} 徽章
                </div>
              </div>
              <button
                onClick={() => setCurrentView('achievements')}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                查看成就 →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 主要內容區域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {/* ... 其他內容保持不變 ... */}
        </AnimatePresence>
      </main>
    </div>
  );
}