import { useTranslation } from "react-i18next";
import {
  normalizeInstructions,
  getCategoryIcon,
} from "../utils/scenario-helpers";

interface LearningTasksSectionProps {
  tasks: Record<string, unknown>[];
  ksaMapping: Record<string, unknown> | null;
}

export function LearningTasksSection({
  tasks,
  ksaMapping,
}: LearningTasksSectionProps) {
  const { t, i18n } = useTranslation(["pbl", "common"]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
        {t("details.learningTasks", "Learning Tasks")}
      </h2>

      {/* Scenario KSA Overview */}
      {ksaMapping ? (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
            🧠{" "}
            {t(
              "details.ksaCompetenciesCovered",
              "KSA Competencies Covered in This Scenario",
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {ksaMapping?.knowledge &&
            Array.isArray(ksaMapping.knowledge) &&
            ksaMapping.knowledge.length > 0 ? (
              <div>
                <span className="font-medium text-green-700 dark:text-green-300">
                  {t("details.knowledge", "Knowledge")}:{" "}
                </span>
                <span className="text-green-600 dark:text-green-400">
                  {ksaMapping?.knowledge &&
                    Array.isArray(ksaMapping.knowledge) &&
                    ksaMapping.knowledge
                      .map((item: unknown) =>
                        typeof item === "string"
                          ? item
                          : item && typeof item === "object" && "code" in item
                            ? String(item.code)
                            : "",
                      )
                      .filter(Boolean)
                      .join(", ")}
                </span>
              </div>
            ) : null}
            {ksaMapping?.skills &&
            Array.isArray(ksaMapping.skills) &&
            ksaMapping.skills.length > 0 ? (
              <div>
                <span className="font-medium text-blue-700 dark:text-blue-300">
                  {t("details.skills", "Skills")}:{" "}
                </span>
                <span className="text-blue-600 dark:text-blue-400">
                  {ksaMapping?.skills &&
                    Array.isArray(ksaMapping.skills) &&
                    ksaMapping.skills
                      .map((item: unknown) =>
                        typeof item === "string"
                          ? item
                          : item && typeof item === "object" && "code" in item
                            ? String(item.code)
                            : "",
                      )
                      .filter(Boolean)
                      .join(", ")}
                </span>
              </div>
            ) : null}
            {ksaMapping?.attitudes &&
            Array.isArray(ksaMapping.attitudes) &&
            ksaMapping.attitudes.length > 0 ? (
              <div>
                <span className="font-medium text-purple-700 dark:text-purple-300">
                  {t("details.attitudes", "Attitudes")}:{" "}
                </span>
                <span className="text-purple-600 dark:text-purple-400">
                  {ksaMapping?.attitudes &&
                    Array.isArray(ksaMapping.attitudes) &&
                    ksaMapping.attitudes
                      .map((item: unknown) =>
                        typeof item === "string"
                          ? item
                          : item && typeof item === "object" && "code" in item
                            ? String(item.code)
                            : "",
                      )
                      .filter(Boolean)
                      .join(", ")}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Tasks List */}
      <div className="space-y-4">
        {tasks.map((task: Record<string, unknown>, taskIndex: number) => (
          <div
            key={(task.id as string) || taskIndex}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <h5 className="font-medium text-gray-900 dark:text-white">
                {taskIndex + 1}. {task.title as string}
              </h5>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {getCategoryIcon(
                    (task.category as string) || (task.type as string),
                  )}
                </span>
                {task.timeLimit ? (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {String(task.timeLimit)} {t("details.min", "min")}
                  </span>
                ) : null}
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              {String(task.description)}
            </p>

            {/* Instructions */}
            {(() => {
              const instructions = normalizeInstructions(
                (task as Record<string, unknown>).instructions,
                i18n.language,
              );
              return instructions.length > 0 ? (
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    {t("details.instructions", "Instructions")}
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    {instructions.map((instruction: string, i: number) => (
                      <li key={i} className="flex items-start">
                        <span className="text-gray-400 mr-2">•</span>
                        {instruction}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })()}

            {/* KSA Focus */}
            {(() => {
              const ksaFocus = task.KSA_focus as
                | Record<string, unknown>
                | undefined;
              return ksaFocus ? (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-3 mb-3">
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                    🧠 KSA
                  </p>
                  <div className="space-y-1">
                    {ksaFocus.primary &&
                    Array.isArray(ksaFocus.primary) &&
                    ksaFocus.primary.length > 0 ? (
                      <div>
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                          {t("details.primary", "Primary")}:{" "}
                        </span>
                        <span className="text-xs text-purple-600 dark:text-purple-400">
                          {(ksaFocus.primary as unknown[])
                            .map((item: unknown) =>
                              String(
                                typeof item === "string"
                                  ? item
                                  : item &&
                                      typeof item === "object" &&
                                      "code" in item
                                    ? item.code
                                    : item,
                              ),
                            )
                            .join(", ")}
                        </span>
                      </div>
                    ) : null}
                    {ksaFocus.secondary &&
                    Array.isArray(ksaFocus.secondary) &&
                    ksaFocus.secondary.length > 0 ? (
                      <div>
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                          {t("details.secondary", "Secondary")}:{" "}
                        </span>
                        <span className="text-xs text-purple-600 dark:text-purple-400">
                          {(ksaFocus.secondary as unknown[])
                            .map((item: unknown) =>
                              String(
                                typeof item === "string"
                                  ? item
                                  : item &&
                                      typeof item === "object" &&
                                      "code" in item
                                    ? item.code
                                    : item,
                              ),
                            )
                            .join(", ")}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Expected Outcome */}
            {task.expectedOutcome ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                  {t("details.expectedOutcome", "Expected Outcome")}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {String(task.expectedOutcome)}
                </p>
              </div>
            ) : null}
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            {t("details.noTasks", "No tasks defined for this scenario")}
          </div>
        )}
      </div>
    </div>
  );
}
