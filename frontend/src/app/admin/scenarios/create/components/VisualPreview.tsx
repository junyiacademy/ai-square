'use client';

/**
 * VisualPreview Component
 * Visual representation of the scenario
 */

import * as yaml from 'js-yaml';
import type { ParsedScenarioData } from '@/types/prompt-to-course';

interface VisualPreviewProps {
  yaml: string;
}

export function VisualPreview({ yaml: yamlContent }: VisualPreviewProps) {
  let data: ParsedScenarioData | null = null;
  let parseError: string | null = null;

  try {
    data = yaml.load(yamlContent) as ParsedScenarioData;
  } catch (error) {
    parseError = error instanceof Error ? error.message : 'Failed to parse YAML';
  }

  if (parseError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-2">⚠️ Parse Error</div>
        <div className="text-sm text-gray-600">{parseError}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        No data to preview
      </div>
    );
  }

  const getMultilingualText = (field: Record<string, string> | string | undefined, lang = 'en'): string => {
    if (!field) return 'N/A';
    if (typeof field === 'string') return field;
    return field[lang] || field.en || Object.values(field)[0] || 'N/A';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-l-4 border-blue-500 pl-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
            {data.mode?.toUpperCase()}
          </span>
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
            {data.difficulty}
          </span>
          <span className="text-sm text-gray-600">
            ⏱️ {data.estimatedMinutes} min
          </span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {getMultilingualText(data.title)}
        </h2>
        <p className="text-gray-600">
          {getMultilingualText(data.description)}
        </p>
      </div>

      {/* Tasks */}
      {data.taskTemplates && data.taskTemplates.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tasks ({data.taskTemplates.length})
          </h3>
          <div className="space-y-3">
            {data.taskTemplates.map((task, index) => (
              <div
                key={task.id || index}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {index + 1}
                    </span>
                    <h4 className="font-medium text-gray-900">
                      {getMultilingualText(task.title)}
                    </h4>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                    {task.type}
                  </span>
                </div>
                {task.description && (
                  <p className="text-sm text-gray-600 ml-8">
                    {getMultilingualText(task.description)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode-specific data preview */}
      {data.mode === 'pbl' && data.pblData && Object.keys(data.pblData).length > 0 ? (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="text-sm font-semibold text-purple-900 mb-2">🎯 PBL Scenario</h3>
          <p className="text-sm text-purple-700">
            Problem-Based Learning scenario with interactive stages
          </p>
        </div>
      ) : null}

      {data.mode === 'discovery' && data.discoveryData && Object.keys(data.discoveryData).length > 0 ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-sm font-semibold text-green-900 mb-2">🚀 Discovery Path</h3>
          <p className="text-sm text-green-700">
            Career exploration with hands-on experience
          </p>
        </div>
      ) : null}

      {data.mode === 'assessment' && data.assessmentData && Object.keys(data.assessmentData).length > 0 ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h3 className="text-sm font-semibold text-amber-900 mb-2">📊 Assessment</h3>
          <p className="text-sm text-amber-700">
            Structured assessment to evaluate learning
          </p>
        </div>
      ) : null}
    </div>
  );
}
