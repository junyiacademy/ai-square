'use client';

import { useScenarios } from '@/lib/v2/hooks/useScenarios';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { BookOpen, Search, ClipboardCheck, ChevronRight, Loader2 } from 'lucide-react';
import { ScenarioType } from '@/lib/types/pbl';

const typeIcons = {
  pbl: BookOpen,
  discovery: Search,
  assessment: ClipboardCheck,
};

const typeColors = {
  pbl: 'from-blue-500 to-blue-600',
  discovery: 'from-purple-500 to-purple-600',
  assessment: 'from-green-500 to-green-600',
};

export function ScenarioList() {
  const { scenarios, loading, error } = useScenarios();
  const { t, i18n } = useTranslation();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 py-8">
        {t('v2.error.loadScenarios', 'Failed to load scenarios')}
      </div>
    );
  }

  const groupedScenarios = scenarios.reduce((acc, scenario) => {
    const type = scenario.type || 'pbl';
    if (!acc[type]) acc[type] = [];
    acc[type].push(scenario);
    return acc;
  }, {} as Record<ScenarioType, typeof scenarios>);

  const getLocalizedField = (obj: any, field: string) => {
    const lang = i18n.language;
    const fieldWithLang = `${field}_${lang}`;
    return obj[fieldWithLang] || obj[field] || '';
  };

  return (
    <div className="space-y-8">
      {Object.entries(groupedScenarios).map(([type, typeScenarios]) => {
        const Icon = typeIcons[type as ScenarioType];
        const gradientColor = typeColors[type as ScenarioType];

        return (
          <div key={type} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-lg bg-gradient-to-r ${gradientColor}`}>
                <Icon className="text-white" size={24} />
              </div>
              <h2 className="text-2xl font-semibold capitalize">
                {t(`v2.scenarioType.${type}`, type)} {t('v2.scenarios', 'Scenarios')}
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {typeScenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  onClick={() => router.push(`/v2/scenarios/${scenario.id}`)}
                  className="border rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">
                      {getLocalizedField(scenario, 'title')}
                    </h3>
                    <ChevronRight className="text-gray-400 group-hover:text-blue-600 transition-colors" size={20} />
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {getLocalizedField(scenario, 'description')}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {scenario.tasks?.length || 0} {t('v2.tasks', 'tasks')}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${gradientColor} text-white`}>
                      {scenario.difficulty || 'medium'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}