"use client";

import { useTranslation } from "react-i18next";

interface CompletionHeaderProps {
  scenarioTitle: string;
}

export function CompletionHeader({ scenarioTitle }: CompletionHeaderProps) {
  const { t } = useTranslation("pbl");

  return (
    <div className="text-center mb-8">
      <div className="mb-4">
        <svg
          className="w-24 h-24 text-green-500 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {t("complete.congratulations")}
      </h1>
      <p className="text-xl text-gray-600 dark:text-gray-400">
        {t("complete.scenarioCompleted", { title: scenarioTitle })}
      </p>
    </div>
  );
}
