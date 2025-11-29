/**
 * GraphLegend - Legend and instructions for the knowledge graph
 * Extracted from KSAKnowledgeGraph.tsx
 */

'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

export default function GraphLegend() {
  const { t } = useTranslation('ksa');

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">≥80% {t('excellent')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">60-79% {t('good')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">&lt;60% {t('needsWork')}</span>
        </div>
      </div>
      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('graphInstructions')}
        </span>
      </div>
    </div>
  );
}
