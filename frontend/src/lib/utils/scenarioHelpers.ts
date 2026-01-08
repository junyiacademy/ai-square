import { IScenario } from "@/types/unified-learning";

/**
 * Get Tailwind CSS classes for difficulty badge
 */
export function getDifficultyBadge(difficulty: string): string {
  switch (difficulty) {
    case "beginner":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "intermediate":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "advanced":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
}

/**
 * Get emoji icon for task category
 */
export function getCategoryIcon(category: string): string {
  switch (category) {
    case "analysis":
      return "📊";
    case "creation":
      return "✨";
    case "evaluation":
      return "🔍";
    case "application":
      return "🚀";
    default:
      return "📝";
  }
}

/**
 * Get data from scenario, checking both top-level and metadata
 */
export function getScenarioData(
  scenario: IScenario | null,
  key: string,
  fallback: unknown = null,
): unknown {
  if (!scenario) return fallback;

  // First check top-level scenario properties
  if (key in scenario) {
    return (scenario as unknown as Record<string, unknown>)[key];
  }

  // Then check metadata
  return (scenario.metadata as Record<string, unknown>)?.[key] || fallback;
}
