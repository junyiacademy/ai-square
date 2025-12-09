import React from 'react';
import type { Scenario } from '@/types/pbl';
import { getLocalizedField } from '@/app/pbl/scenarios/[id]/programs/[programId]/tasks/[taskId]/utils/task-helpers';

export interface TaskHeaderProps {
  scenario: Scenario;
  language: string;
}

export function TaskHeader({ scenario, language }: TaskHeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm flex-shrink-0">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {getLocalizedField(scenario as unknown as Record<string, unknown>, 'title', language)}
          </h1>
        </div>
      </div>
    </header>
  );
}
