'use client';

import { Brain, ChevronRight } from 'lucide-react';
import type { RecommendedScenario } from '@/types/chat';

interface RecommendationsCardProps {
  scenarios: RecommendedScenario[];
}

export function RecommendationsCard({ scenarios }: RecommendationsCardProps) {
  if (scenarios.length === 0) return null;

  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
        <Brain className="w-4 h-4 text-blue-500" />
        Recommended for You
      </h3>
      <div className="space-y-3">
        {scenarios.map((scenario) => (
          <a
            key={scenario.id}
            href={`/pbl/scenarios/${scenario.id}`}
            className="block p-3 bg-white rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">{scenario.title}</div>
                <div className="text-xs text-gray-500 mt-1">{scenario.reason}</div>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="text-gray-400">{scenario.difficulty}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-400">{scenario.estimatedTime} min</span>
                </div>
              </div>
              <div className="text-blue-500 ml-2">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
