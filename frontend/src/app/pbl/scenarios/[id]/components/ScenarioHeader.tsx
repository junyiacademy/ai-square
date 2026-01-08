import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IScenario, IProgram } from "@/types/unified-learning";
import { getDifficultyBadge } from "../utils/scenario-helpers";

interface ScenarioHeaderProps {
  scenario: IScenario;
  userPrograms: IProgram[];
  scenarioId: string;
  isScenarioInteractive: boolean;
  isStarting: boolean;
  isProgramsCollapsed: boolean;
  setIsProgramsCollapsed: (value: boolean) => void;
  handleStartProgram: (programId?: string) => Promise<void>;
  getScenarioData: (key: string, fallback?: unknown) => unknown;
}

export function ScenarioHeader({
  scenario,
  userPrograms,
  scenarioId,
  isScenarioInteractive,
  isStarting,
  isProgramsCollapsed,
  setIsProgramsCollapsed,
  handleStartProgram,
  getScenarioData,
}: ScenarioHeaderProps) {
  const { t, i18n } = useTranslation(["pbl", "common"]);
  const router = useRouter();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {typeof scenario.title === "string"
              ? scenario.title
              : scenario.title[i18n.language] || scenario.title.en || ""}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            {typeof scenario.description === "string"
              ? scenario.description
              : scenario.description[i18n.language] ||
                scenario.description.en ||
                ""}
          </p>

          {/* Metadata */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyBadge(String(getScenarioData("difficulty", "beginner")))}`}
              >
                {t(
                  `difficulty.${String(getScenarioData("difficulty", "beginner"))}`,
                  String(getScenarioData("difficulty", "beginner")),
                )}
              </span>
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                {String(getScenarioData("estimatedDuration", 30))}{" "}
                {t("common:minutes", "minutes")}
              </span>
            </div>
          </div>

          {/* Programs Section */}
          {userPrograms.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <button
                onClick={() => setIsProgramsCollapsed(!isProgramsCollapsed)}
                className="flex items-center w-full mb-3 text-left hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md p-2 -m-2 transition-colors"
              >
                <svg
                  className={`w-3 h-3 mr-2 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                    isProgramsCollapsed ? "rotate-0" : "rotate-90"
                  }`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6-6 6-1.41-1.41z" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t("details.yourPrograms", "Your Programs")} (
                  {userPrograms.length})
                </h3>
              </button>
              {!isProgramsCollapsed && (
                <div className="space-y-2">
                  {userPrograms.map((program, index) => (
                    <div
                      key={program.id}
                      className="p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {index === 0
                              ? t("details.latestProgram", "Latest Program")
                              : `${t("common:program", "Program")} ${userPrograms.length - index}`}
                          </span>
                          <span
                            className={`ml-3 text-xs px-2 py-1 rounded-full ${
                              program.status === "completed"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : program.status === "active"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {t(`status.${program.status}`, program.status)}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <div>
                          {t("common:progress", "Progress")}:{" "}
                          {(program.metadata?.completedTaskCount as number) ||
                            0}
                          /{(program.metadata?.totalTaskCount as number) || 0}{" "}
                          {t("common:tasks", "tasks")}
                          {program.metadata &&
                          typeof program.metadata.completedTaskCount ===
                            "number" &&
                          program.metadata.completedTaskCount > 0 &&
                          program.metadata.evaluationId ? (
                            <>
                              <span className="mx-2">•</span>
                              <span className="font-medium">
                                {t("hasEvaluation", "Has Evaluation")}
                              </span>
                            </>
                          ) : null}
                        </div>
                        <div>
                          {t("common:startedAt", "Started")}:{" "}
                          {program.startedAt
                            ? new Date(program.startedAt).toLocaleDateString(
                                i18n.language,
                              )
                            : "Not started"}
                          {program.completedAt && (
                            <>
                              <span className="mx-2">•</span>
                              {t("common:completedAt", "Completed")}:{" "}
                              {new Date(program.completedAt).toLocaleDateString(
                                i18n.language,
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() =>
                            isScenarioInteractive &&
                            handleStartProgram(program.id)
                          }
                          disabled={!isScenarioInteractive}
                          className={`text-sm px-4 py-2 rounded-md transition-colors font-medium ${
                            isScenarioInteractive
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "bg-gray-200 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {t("common:continue", "Continue")}
                        </button>
                        {(program.metadata &&
                          typeof program.metadata.completedTaskCount ===
                            "number" &&
                          program.metadata.completedTaskCount > 0) ||
                        program.status === "completed" ||
                        program.metadata?.evaluationId ? (
                          <button
                            onClick={() =>
                              router.push(
                                `/pbl/scenarios/${scenarioId}/programs/${program.id}/complete`,
                              )
                            }
                            className="text-sm px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium"
                          >
                            {t("viewResults", "View Results")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleStartProgram()}
                disabled={isStarting || !isScenarioInteractive}
                className={`px-6 py-3 rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${
                  isScenarioInteractive
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {isStarting
                  ? t("common:loading", "Loading...")
                  : isScenarioInteractive
                    ? t("details.startNewProgram", "Start New Program")
                    : t("details.startUnavailable", "尚未開放")}
              </button>
              {!isScenarioInteractive && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t(
                    "details.startUnavailableHint",
                    "此活動目前僅供瀏覽內容。",
                  )}
                </span>
              )}
            </div>
            <Link
              href="/pbl/scenarios"
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t("details.backToScenarios", "Back to Scenarios")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
