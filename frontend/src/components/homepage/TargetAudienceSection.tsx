'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

interface Audience {
  key: string;
  icon: React.ReactNode;
  color: string;
}

export default function TargetAudienceSection() {
  const { t } = useTranslation('homepage');

  const audiences: Audience[] = [
    {
      key: 'individuals',
      color: 'blue',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      key: 'educators',
      color: 'green',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17l-2 4m2-4v4m0-4h6m0 0l2 4m-2-4v4" />
        </svg>
      )
    },
    {
      key: 'organizations',
      color: 'purple',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    }
  ];

  const colorClasses = {
    blue: 'from-blue-400 to-blue-600',
    green: 'from-green-400 to-green-600',
    purple: 'from-purple-400 to-purple-600'
  };

  const bgColorClasses = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    purple: 'bg-purple-50'
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('target.title')}
          </h2>
          <p className="text-xl text-gray-600">
            {t('target.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {audiences.map((audience) => (
            <div 
              key={audience.key}
              className={`relative overflow-hidden rounded-2xl p-8 ${bgColorClasses[audience.color]} hover:shadow-xl transition-all duration-300`}
            >
              <div className="relative z-10">
                <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br ${colorClasses[audience.color]} text-white rounded-2xl mb-6 shadow-lg`}>
                  {audience.icon}
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {t(`target.audiences.${audience.key}.title`)}
                </h3>

                <p className="text-gray-700">
                  {t(`target.audiences.${audience.key}.description`)}
                </p>
              </div>

              {/* Decorative element */}
              <div className={`absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-br ${colorClasses[audience.color]} rounded-full opacity-10`}></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}