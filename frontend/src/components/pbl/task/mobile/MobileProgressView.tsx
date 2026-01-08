"use client";

import Link from "next/link";
import { type TFunction } from "i18next";
import { Scenario, Task } from "@/types/pbl";
import {
  getQualitativeRating,
  getLocalizedField,
} from "@/app/pbl/scenarios/[id]/programs/[programId]/tasks/[taskId]/utils/task-helpers";

interface TaskEvaluation {
  score: number;
}

interface ProgramTask {
  id: string;
  taskIndex: number;
}

interface MobileProgressViewProps {
  scenario: Scenario;
  currentTask: Task | null;
  programTasks: ProgramTask[];
  taskEvaluations: Record<string, TaskEvaluation>;
  scenarioId: string;
  programId: string;
  language: string;
  onSwitchTask: (taskId: string) => void;
  onViewChange: (view: "progress" | "task" | "chat") => void;
  t: TFunction;
}

export function MobileProgressView({
  scenario,
  currentTask,
  programTasks,
  taskEvaluations,
  scenarioId,
  programId,
  language,
  onSwitchTask,
  onViewChange,
  t,
}: MobileProgressViewProps) {
  return (
    <div className="h-full bg-white dark:bg-gray-800 p-4 overflow-y-auto">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
        {t("pbl:learn.progress")}
      </h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
        <div className="space-y-6 relative">
          {scenario.tasks.map((task, index) => {
            const programTask = programTasks[index];
            const actualTaskId = programTask?.id || task.id;
            const isCurrent = currentTask && currentTask.id === actualTaskId;
            const taskEvaluation = taskEvaluations[actualTaskId];
            const hasEvaluation = !!taskEvaluation;

            return (
              <button
                key={task.id}
                onClick={() => {
                  onSwitchTask(actualTaskId);
                  onViewChange("chat");
                }}
                className="flex items-center w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
              >
                <div
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white dark:bg-gray-800 flex-shrink-0 ${
                    hasEvaluation
                      ? "border-green-600 dark:border-green-500"
                      : isCurrent
                        ? "border-purple-600 dark:border-purple-500 ring-2 ring-purple-600 ring-offset-2"
                        : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {hasEvaluation ? (
                    <svg
                      className="h-5 w-5 text-green-600 dark:text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span
                      className={`text-sm font-medium ${
                        isCurrent
                          ? "text-purple-600 dark:text-purple-400"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      isCurrent
                        ? "text-purple-600 dark:text-purple-400"
                        : hasEvaluation
                          ? "text-gray-900 dark:text-white"
                          : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {getLocalizedField(
                      task as unknown as Record<string, unknown>,
                      "title",
                      language,
                    )}
                  </p>
                  {hasEvaluation &&
                    taskEvaluation.score !== undefined &&
                    (() => {
                      const rating = getQualitativeRating(taskEvaluation.score);
                      return (
                        <p
                          className={`text-xs font-medium mt-0.5 ${rating.color}`}
                        >
                          {t(rating.i18nKey)}
                        </p>
                      );
                    })()}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* View Report Link */}
      {Object.keys(taskEvaluations).length > 0 && (
        <div className="mt-6">
          <Link
            href={`/pbl/scenarios/${scenarioId}/programs/${programId}/complete`}
            className="flex items-center justify-center w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {t("pbl:complete.viewReport", "View Report")}
          </Link>
        </div>
      )}
    </div>
  );
}
