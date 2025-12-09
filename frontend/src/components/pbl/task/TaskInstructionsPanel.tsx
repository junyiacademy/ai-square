'use client';

import { useTranslation } from 'react-i18next';
import { Task } from '@/types/pbl';
import { getLocalizedField } from '@/app/pbl/scenarios/[id]/programs/[programId]/tasks/[taskId]/utils/task-helpers';

interface TaskInstructionsPanelProps {
  currentTask: Task;
  taskIndex: number;
  language: string;
}

export function TaskInstructionsPanel({
  currentTask,
  taskIndex,
  language
}: TaskInstructionsPanelProps) {
  const { t } = useTranslation('pbl');

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {t('learn.task')} {taskIndex + 1}: {(() => {
          const title = currentTask.title;
          if (typeof title === 'object' && title !== null && !Array.isArray(title)) {
            // Handle multilingual object format {en: "...", zh: "..."}
            const titleObj = title as Record<string, string>;
            return titleObj[language] || titleObj['en'] || Object.values(titleObj)[0] || '';
          }
          // Fallback to suffix-based format
          return getLocalizedField(currentTask as unknown as Record<string, unknown>, 'title', language);
        })()}
      </h2>

      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            {t('learn.description')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {getLocalizedField(currentTask as unknown as Record<string, unknown>, 'description', language)}
          </p>
        </div>

        <div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            {t('learn.instructions')}
          </h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            {Array.isArray(currentTask.instructions) ? currentTask.instructions.map((instruction, index) => (
              <li key={index}>{instruction}</li>
            )) : (
              <li>{t('learn.noInstructionsAvailable')}</li>
            )}
          </ul>
        </div>

        {currentTask.expectedOutcome && (
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              {t('details.expectedOutcome')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {getLocalizedField(currentTask as unknown as Record<string, unknown>, 'expectedOutcome', language)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
