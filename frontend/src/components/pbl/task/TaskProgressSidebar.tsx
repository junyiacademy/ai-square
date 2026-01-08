import React from "react";
import Link from "next/link";
import { Scenario } from "@/types/pbl";
import { TaskEvaluation } from "@/types/pbl-completion";
import {
  getQualitativeRating,
  getLocalizedField,
} from "../../../app/pbl/scenarios/[id]/programs/[programId]/tasks/[taskId]/utils/task-helpers";
import { TFunction } from "i18next";

interface ProgramTask {
  id: string;
  taskIndex: number;
}

export interface TaskProgressSidebarProps {
  scenario: Scenario;
  currentTaskId: string;
  programTasks: ProgramTask[];
  taskEvaluations: Record<string, TaskEvaluation>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSwitchTask: (taskId: string) => void;
  language: string;
  scenarioId: string;
  programId: string;
  t: TFunction<readonly ["pbl", "common"], undefined>;
}

export const TaskProgressSidebar: React.FC<TaskProgressSidebarProps> = ({
  scenario,
  currentTaskId,
  programTasks,
  taskEvaluations,
  isCollapsed,
  onToggleCollapse,
  onSwitchTask,
  language,
  scenarioId,
  programId,
  t,
}) => {
  return (
    <div
      className={`bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 relative ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="h-full flex flex-col">
        <div
          className={`flex items-center justify-between ${
            isCollapsed ? "px-2 py-4" : "p-4"
          }`}
        >
          <h3
            className={`font-semibold text-gray-900 dark:text-white transition-all duration-300 ${
              isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            }`}
          >
            {t("pbl:learn.progress")}
          </h3>
          <button
            onClick={onToggleCollapse}
            className={`p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${
              isCollapsed ? "mx-auto" : ""
            }`}
          >
            <svg
              className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
                isCollapsed ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>

        {/* Vertical Progress */}
        <div className={`flex-1 relative ${isCollapsed ? "px-2" : "px-4"}`}>
          {!isCollapsed && (
            <>
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
              <div className="space-y-6 relative">
                {scenario.tasks.map((task, index) => {
                  const programTask = programTasks[index];
                  const actualTaskId = programTask?.id || task.id;
                  const isEvaluated = !!taskEvaluations[actualTaskId];
                  const isCurrent = currentTaskId === actualTaskId;
                  const taskEval = taskEvaluations[actualTaskId];

                  return (
                    <button
                      key={task.id}
                      onClick={() => onSwitchTask(actualTaskId)}
                      className="flex items-center w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                    >
                      <div
                        className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white dark:bg-gray-800 flex-shrink-0 ${
                          isEvaluated
                            ? "border-green-600 dark:border-green-500"
                            : isCurrent
                              ? "border-purple-600 dark:border-purple-500 ring-2 ring-purple-600 ring-offset-2 dark:ring-offset-white dark:ring-offset-gray-800"
                              : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {isEvaluated ? (
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
                              : isEvaluated
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
                        {isEvaluated &&
                          taskEval?.score !== undefined &&
                          (() => {
                            const rating = getQualitativeRating(taskEval.score);
                            return (
                              <p
                                className={`text-xs font-medium ${rating.color}`}
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
            </>
          )}

          {/* Collapsed State - Show only icons */}
          {isCollapsed && (
            <div className="space-y-4">
              {scenario.tasks.map((task, index) => {
                const programTask = programTasks[index];
                const actualTaskId = programTask?.id || task.id;
                const isEvaluated = !!taskEvaluations[actualTaskId];
                const isCurrent = currentTaskId === actualTaskId;
                const taskEval = taskEvaluations[actualTaskId];

                return (
                  <button
                    key={task.id}
                    onClick={() => onSwitchTask(actualTaskId)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white dark:bg-gray-800 mx-auto ${
                      isEvaluated
                        ? "border-green-600 dark:border-green-500"
                        : isCurrent
                          ? "border-purple-600 dark:border-purple-500 ring-2 ring-purple-600 ring-offset-2"
                          : "border-gray-300 dark:border-gray-600"
                    }`}
                    title={`${getLocalizedField(
                      task as unknown as Record<string, unknown>,
                      "title",
                      language,
                    )}${
                      isEvaluated && taskEval?.score !== undefined
                        ? ` - ${t(getQualitativeRating(taskEval.score).i18nKey)}`
                        : ""
                    }`}
                  >
                    {isEvaluated ? (
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
                  </button>
                );
              })}
            </div>
          )}

          {/* View Report Link */}
          {!isCollapsed && Object.keys(taskEvaluations).length > 0 && (
            <div className="mt-6 px-4">
              <Link
                href={`/pbl/scenarios/${scenarioId}/programs/${programId}/complete`}
                className="flex items-center justify-center w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
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
      </div>
    </div>
  );
};
