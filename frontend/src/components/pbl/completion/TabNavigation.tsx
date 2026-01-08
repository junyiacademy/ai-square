"use client";

import { useTranslation } from "react-i18next";

interface TabNavigationProps {
  activeTab: "results" | "certificate";
  onTabChange: (tab: "results" | "certificate") => void;
  allTasksEvaluated: boolean;
}

export function TabNavigation({
  activeTab,
  onTabChange,
  allTasksEvaluated,
}: TabNavigationProps) {
  const { t } = useTranslation("pbl");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-8 no-print">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6 overflow-x-auto">
          <button
            onClick={() => onTabChange("results")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === "results"
                ? "border-purple-500 text-purple-600 dark:text-purple-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300"
            }`}
          >
            {t("complete.results")}
          </button>
          <button
            onClick={() => allTasksEvaluated && onTabChange("certificate")}
            disabled={!allTasksEvaluated}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${
              !allTasksEvaluated
                ? "border-transparent text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : activeTab === "certificate"
                  ? "border-purple-500 text-purple-600 dark:text-purple-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300"
            }`}
          >
            <span>{t("complete.certificate.title")}</span>
            {!allTasksEvaluated && (
              <>
                <span className="text-xs">🔒</span>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  ({t("complete.certificate.requireAllTasks", "需完成所有任務")}
                  )
                </span>
              </>
            )}
          </button>
        </nav>
      </div>
    </div>
  );
}
