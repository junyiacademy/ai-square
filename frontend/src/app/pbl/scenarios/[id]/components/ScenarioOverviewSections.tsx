import { useTranslation } from "react-i18next";
import { IScenario } from "@/types/unified-learning";

interface ScenarioOverviewSectionsProps {
  scenario: IScenario;
  getScenarioData: (key: string, fallback?: unknown) => unknown;
  handleVideoClick: (url: string) => void;
  getDomainTranslation: (domain: string) => string;
}

export function ScenarioOverviewSections({
  scenario,
  getScenarioData,
  handleVideoClick,
  getDomainTranslation,
}: ScenarioOverviewSectionsProps) {
  const { t, i18n } = useTranslation(["pbl", "common"]);

  return (
    <>
      {/* Overview Section */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Learning Objectives */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="text-2xl mr-2">🎯</span>
            {t("details.learningObjectives", "Learning Objectives")}
          </h2>
          <ul className="space-y-2">
            {(() => {
              const objectives = scenario.objectives || [];
              // Handle both legacy string[] and new multilingual Record<string, string[]> formats
              if (Array.isArray(objectives)) {
                return objectives;
              } else {
                // It's a Record<string, string[]>, get the current language or fallback to English
                const lang = i18n.language;
                return (
                  (objectives as Record<string, string[]>)[lang] ||
                  (objectives as Record<string, string[]>).en ||
                  []
                );
              }
            })().map((objective: string, index: number) => (
              <li key={index} className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-gray-600 dark:text-gray-300">
                  {objective}
                </span>
              </li>
            ))}
            {(!scenario.objectives || scenario.objectives.length === 0) && (
              <li className="text-gray-500 dark:text-gray-400">
                {t("details.noObjectives", "No objectives specified")}
              </li>
            )}
          </ul>
        </div>

        {/* Prerequisites */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="text-2xl mr-2">📋</span>
            {t("details.prerequisites", "Prerequisites")}
          </h2>
          <ul className="space-y-2">
            {(getScenarioData("prerequisites", []) as string[]).map(
              (prereq: string, index: number) => {
                // Check if the prerequisite contains a URL
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const parts = prereq.split(urlRegex);

                return (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span className="text-gray-600 dark:text-gray-300">
                      {parts.map((part, i) => {
                        // If this part is a URL, make it a clickable link
                        if (part.match(/^https?:\/\//)) {
                          return (
                            <button
                              key={i}
                              onClick={() => handleVideoClick(part)}
                              className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              {part}
                            </button>
                          );
                        }
                        return <span key={i}>{part}</span>;
                      })}
                    </span>
                  </li>
                );
              },
            )}
            {(getScenarioData("prerequisites", []) as string[]).length ===
              0 && (
              <li className="text-gray-500 dark:text-gray-400">
                {t("details.noPrerequisites", "No prerequisites")}
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Target Domains */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <span className="text-2xl mr-2">🌐</span>
          {t("details.targetDomains", "Target Domains")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {(getScenarioData("targetDomains", []) as string[]).map(
            (domain: string, index: number) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                {getDomainTranslation(domain)}
              </span>
            ),
          )}
          {(getScenarioData("targetDomains", []) as string[]).length === 0 && (
            <span className="text-gray-500 dark:text-gray-400">
              {t("details.noTargetDomains", "No target domains specified")}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
