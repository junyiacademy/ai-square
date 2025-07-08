'use client';

import { ScenarioList } from '@/lib/v2/components/ScenarioList';
import { useTranslation } from 'react-i18next';

export default function ScenariosPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {t('v2.scenarios.title', 'AI Learning Scenarios')}
        </h1>
        <ScenarioList />
      </div>
    </div>
  );
}