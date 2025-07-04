'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { 
  AcademicCapIcon, 
  GlobeAltIcon,
  ChartBarIcon,
  TrophyIcon,
  FolderOpenIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  disabled?: boolean;
  badge?: number;
}

interface DiscoveryHeaderProps {
  hasAssessmentResults?: boolean;
  workspaceCount?: number;
  achievementCount?: number;
}

export default function DiscoveryHeader({ 
  hasAssessmentResults = false,
  workspaceCount = 0,
  achievementCount = 0
}: DiscoveryHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation(['discovery', 'navigation']);

  const navigationItems: NavigationItem[] = [
    {
      id: 'overview',
      label: '總覽',
      icon: AcademicCapIcon,
      href: '/discovery/overview'
    },
    {
      id: 'evaluation',
      label: '評估',
      icon: ChartBarIcon,
      href: '/discovery/evaluation'
    },
    {
      id: 'paths',
      label: '路徑',
      icon: GlobeAltIcon,
      href: '/discovery/paths',
      disabled: !hasAssessmentResults
    },
    {
      id: 'workspace',
      label: '工作區',
      icon: FolderOpenIcon,
      href: '/discovery/workspace',
      badge: workspaceCount > 0 ? workspaceCount : undefined
    },
    {
      id: 'achievements',
      label: '成就',
      icon: TrophyIcon,
      href: '/discovery/achievements',
      badge: achievementCount > 0 ? achievementCount : undefined
    }
  ];

  const isActive = (item: NavigationItem) => {
    return pathname === item.href;
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
          <button 
            onClick={() => router.push('/')}
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
              const active = isActive(item);
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!item.disabled) {
                      router.push(item.href);
                    }
                  }}
                  disabled={item.disabled}
                  className={`
                    inline-flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 group
                    ${active 
                      ? 'bg-purple-600 text-white shadow-lg' 
                      : item.disabled
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-purple-50 hover:text-purple-700 border border-gray-200'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${active ? '' : 'group-hover:scale-110 transition-transform'}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                      active ? 'bg-purple-800 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Mobile: Show current page only */}
          <div className="sm:hidden">
            {navigationItems.map((item) => {
              if (isActive(item)) {
                const Icon = item.icon;
                return (
                  <div key={item.id} className="flex items-center space-x-2 text-purple-600">
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}