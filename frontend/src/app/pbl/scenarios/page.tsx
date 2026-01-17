"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { PBLScenariosListSkeleton } from "@/components/pbl/loading-skeletons";
import { IScenario } from "@/types/unified-learning";
import { authenticatedFetch } from "@/lib/utils/authenticated-fetch";

// Flexible scenario type for API responses that may not fully match unified architecture
type FlexibleScenario = IScenario | Record<string, unknown>;

export default function PBLScenariosPage() {
  const { t, i18n } = useTranslation(["pbl", "assessment"]);
  const [scenarios, setScenarios] = useState<FlexibleScenario[]>([]);
  const [loading, setLoading] = useState(true);

  const getDifficultyStars = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "⭐";
      case "intermediate":
        return "⭐⭐⭐";
      case "advanced":
        return "⭐⭐⭐⭐⭐";
      default:
        return "⭐";
    }
  };

  const getLocalizedText = (
    text: string | Record<string, string> | undefined,
  ): string => {
    if (!text) return "";
    if (typeof text === "string") return text;
    if (typeof text === "object") {
      return text[i18n.language] || text.en || Object.values(text)[0] || "";
    }
    return "";
  };

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchScenarios = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetch(
          `/api/pbl/scenarios?lang=${i18n.language}`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`PBL Scenarios API failed: ${response.status}`);
        }

        const result = await response.json();

        if (isMounted) {
          // Handle PBL API response structure
          if (result.success && result.data?.scenarios) {
            // Show all scenarios (removed semiconductor filter for Issue #76)
            setScenarios(result.data.scenarios as FlexibleScenario[]);
          } else {
            setScenarios([]);
          }
        }
      } catch (error) {
        // Ignore abort errors completely
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        if (isMounted && error instanceof Error) {
          console.error("Error fetching PBL scenarios:", error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchScenarios();

    return () => {
      isMounted = false;
      // Don't call abort() at all in development mode to avoid the error
      if (process.env.NODE_ENV === "production") {
        controller.abort();
      }
    };
  }, [i18n.language]);

  // Extract domains from scenario data (handle both unified architecture and direct API response)
  const getScenarioDomains = (scenario: FlexibleScenario): string[] => {
    // Try unified architecture format first
    if (
      "sourceMetadata" in scenario &&
      (scenario as IScenario).sourceMetadata?.domain
    ) {
      const domain = (
        (scenario as IScenario).sourceMetadata as Record<string, unknown>
      ).domain;
      if (domain && typeof domain === "string") {
        return [domain];
      }
    }
    // Fall back to direct API response format
    if (
      "domains" in scenario &&
      scenario.domains &&
      Array.isArray(scenario.domains)
    ) {
      return scenario.domains as string[];
    }
    if (
      "targetDomains" in scenario &&
      scenario.targetDomains &&
      Array.isArray(scenario.targetDomains)
    ) {
      return scenario.targetDomains as string[];
    }
    if (
      "targetDomain" in scenario &&
      scenario.targetDomain &&
      Array.isArray(scenario.targetDomain)
    ) {
      return scenario.targetDomain as string[];
    }
    return [];
  };

  // Get difficulty from scenario data (handle both formats)
  const getScenarioDifficulty = (scenario: FlexibleScenario): string => {
    // Try unified architecture format first
    if (
      "sourceMetadata" in scenario &&
      (scenario as IScenario).sourceMetadata?.difficulty
    ) {
      return String(
        ((scenario as IScenario).sourceMetadata as Record<string, unknown>)
          .difficulty,
      );
    }
    // Fall back to direct API response format
    return "difficulty" in scenario && scenario.difficulty
      ? String(scenario.difficulty)
      : "intermediate";
  };

  // Calculate estimated duration (handle both formats)
  const getEstimatedDuration = (scenario: FlexibleScenario): number => {
    // Try direct API response format first
    if (
      "estimatedDuration" in scenario &&
      scenario.estimatedDuration &&
      typeof scenario.estimatedDuration === "number"
    ) {
      return scenario.estimatedDuration;
    }
    // Fall back to task templates calculation
    if (
      "taskTemplates" in scenario &&
      scenario.taskTemplates &&
      Array.isArray(scenario.taskTemplates) &&
      scenario.taskTemplates.length > 0
    ) {
      return (scenario.taskTemplates as Record<string, unknown>[]).reduce(
        (total: number, task: Record<string, unknown>) =>
          total + ((task.estimatedTime as number) || 30),
        0,
      );
    }
    return 60; // Default to 60 minutes
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t("title")}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {t("description")}
          </p>
        </div>

        {/* Scenarios Grid */}
        {loading ? (
          <PBLScenariosListSkeleton />
        ) : scenarios.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Loading scenarios from YAML files...
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {scenarios.map((scenario) => {
              const domains = getScenarioDomains(scenario);
              const difficulty = getScenarioDifficulty(scenario);
              const duration = getEstimatedDuration(scenario);

              const isAvailable =
                !("isAvailable" in scenario) || scenario.isAvailable !== false;

              return (
                <div
                  key={String(scenario.id)}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-md ${
                    isAvailable
                      ? "hover:shadow-lg transition-shadow"
                      : "opacity-60"
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <div
                        className={`w-12 h-12 ${
                          isAvailable
                            ? "bg-blue-100 dark:bg-blue-900"
                            : "bg-gray-200 dark:bg-gray-700"
                        } rounded-lg flex items-center justify-center`}
                      >
                        <span className="text-2xl">
                          {("thumbnailEmoji" in scenario
                            ? String(scenario.thumbnailEmoji)
                            : null) || "📚"}
                        </span>
                      </div>
                      <h2 className="ml-4 text-xl font-semibold text-gray-900 dark:text-white pr-16">
                        {getLocalizedText(
                          scenario.title as string | Record<string, string>,
                        )}
                      </h2>
                    </div>

                    {/* Domain Labels */}
                    {domains.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {domains.map((domain) => (
                          <span
                            key={domain}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              domain === "engaging_with_ai"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                : domain === "creating_with_ai"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : domain === "managing_with_ai"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                    : domain === "designing_with_ai"
                                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {t(`assessment:domains.${domain}`)}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mb-4">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <span className="mr-4">
                          {t("difficulty")}: {getDifficultyStars(difficulty)}{" "}
                          {t(`level.${difficulty}`)}
                        </span>
                        <span>
                          {t("duration")}: {duration} {t("minutes")}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300">
                        {getLocalizedText(
                          scenario.description as
                            | string
                            | Record<string, string>,
                        )}
                      </p>
                    </div>

                    {/* Task Count */}
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {"taskTemplates" in scenario &&
                      Array.isArray(scenario.taskTemplates)
                        ? scenario.taskTemplates.length
                        : "taskCount" in scenario
                          ? Number(scenario.taskCount)
                          : 0}{" "}
                      {t("pbl:tasks", "tasks")}
                    </div>

                    {isAvailable ? (
                      <Link
                        href={`/pbl/scenarios/${scenario.id}`}
                        className="block w-full bg-blue-600 text-white text-center px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {t("viewDetails")}
                      </Link>
                    ) : (
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        {t("comingSoon")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Features Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            {t("features.title")}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {t("features.realWorld.title")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("features.realWorld.description")}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {t("features.aiGuidance.title")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("features.aiGuidance.description")}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-purple-600 dark:text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {t("features.progress.title")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("features.progress.description")}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-orange-600 dark:text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {t("features.personalized.title")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("features.personalized.description")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
