import { getDifficultyBadge } from '@/lib/utils/scenarioHelpers';

export interface ScenarioInfoCardProps {
  title: string;
  description: string;
  difficulty: string;
  estimatedDuration: number;
  difficultyLabel: string;
  minutesLabel: string;
}

export function ScenarioInfoCard({
  title,
  description,
  difficulty,
  estimatedDuration,
  difficultyLabel,
  minutesLabel
}: ScenarioInfoCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{title}</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">{description}</p>

          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyBadge(difficulty)}`}>
                {difficultyLabel}
              </span>
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{estimatedDuration} {minutesLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
