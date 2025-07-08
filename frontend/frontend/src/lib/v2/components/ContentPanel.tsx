'use client';

import { useTranslation } from 'react-i18next';
import { ScenarioType } from '@/lib/types/pbl';
import { FileText, MessageSquare, Target } from 'lucide-react';

interface ContentPanelProps {
  task: any;
  scenarioType: ScenarioType;
}

export function ContentPanel({ task, scenarioType }: ContentPanelProps) {
  const { t, i18n } = useTranslation();

  const getLocalizedField = (obj: any, field: string) => {
    const lang = i18n.language;
    const fieldWithLang = `${field}_${lang}`;
    return obj[fieldWithLang] || obj[field] || '';
  };

  const renderPBLContent = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="text-blue-500" size={20} />
          <h3 className="text-lg font-semibold">{t('v2.content.scenario', 'Scenario')}</h3>
        </div>
        <p className="text-gray-700 leading-relaxed">
          {getLocalizedField(task, 'scenario')}
        </p>
      </div>

      {task.background && (
        <div className="bg-blue-50 rounded-lg p-6">
          <h4 className="font-medium mb-2">{t('v2.content.background', 'Background')}</h4>
          <p className="text-gray-700">{getLocalizedField(task, 'background')}</p>
        </div>
      )}

      {task.resources && task.resources.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="font-medium mb-3">{t('v2.content.resources', 'Resources')}</h4>
          <ul className="space-y-2">
            {task.resources.map((resource: any, index: number) => (
              <li key={index} className="flex items-start gap-2">
                <FileText className="text-gray-400 mt-1" size={16} />
                <div>
                  <a href={resource.url} target="_blank" rel="noopener noreferrer" 
                     className="text-blue-600 hover:underline">
                    {getLocalizedField(resource, 'title')}
                  </a>
                  {resource.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {getLocalizedField(resource, 'description')}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderDiscoveryContent = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">{t('v2.content.explore', 'Explore')}</h3>
        <p className="text-gray-700 leading-relaxed">
          {getLocalizedField(task, 'prompt')}
        </p>
      </div>

      {task.hints && task.hints.length > 0 && (
        <div className="bg-purple-50 rounded-lg p-6">
          <h4 className="font-medium mb-3">{t('v2.content.hints', 'Hints')}</h4>
          <ul className="space-y-2">
            {task.hints.map((hint: string, index: number) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span className="text-gray-700">{hint}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderAssessmentContent = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Target className="text-green-500" size={20} />
          <h3 className="text-lg font-semibold">{t('v2.content.question', 'Question')}</h3>
        </div>
        <p className="text-gray-700 leading-relaxed text-lg">
          {getLocalizedField(task, 'question')}
        </p>
      </div>

      {task.context && (
        <div className="bg-green-50 rounded-lg p-6">
          <h4 className="font-medium mb-2">{t('v2.content.context', 'Context')}</h4>
          <p className="text-gray-700">{getLocalizedField(task, 'context')}</p>
        </div>
      )}

      {task.options && task.options.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="font-medium mb-3">{t('v2.content.options', 'Options')}</h4>
          <div className="space-y-2">
            {task.options.map((option: any, index: number) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-white">
                <span className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-medium text-sm">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="text-gray-700">{getLocalizedField(option, 'text')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {getLocalizedField(task, 'title')}
        </h2>
        {task.description && (
          <p className="text-gray-600 mt-2">
            {getLocalizedField(task, 'description')}
          </p>
        )}
      </div>

      {scenarioType === 'pbl' && renderPBLContent()}
      {scenarioType === 'discovery' && renderDiscoveryContent()}
      {scenarioType === 'assessment' && renderAssessmentContent()}
    </div>
  );
}