/**
 * Normalizes various instruction shapes to string[]
 * Acceptable shapes: string | string[] | Record<string,string> | Record<string,string[]>
 * Never renders [object Object]
 */
export function normalizeInstructions(input: unknown, lang: string): string[] {
  if (!input) return [];

  // If it's already an array, process each item
  if (Array.isArray(input)) {
    return input
      .map((v) => {
        if (typeof v === "string") return v;
        if (typeof v === "object" && v !== null) {
          // Check for text property
          if ("text" in v) return String((v as Record<string, unknown>).text);
          // Check for multilingual object
          if (lang in v) return String((v as Record<string, unknown>)[lang]);
          if ("en" in v) return String((v as Record<string, unknown>).en);
          // Check for content property
          if ("content" in v)
            return String((v as Record<string, unknown>).content);
        }
        // Don't stringify objects - skip them
        return null;
      })
      .filter((s): s is string => s !== null && s.trim().length > 0);
  }

  // If it's a single string, return as array
  if (typeof input === "string") return [input];

  // If it's an object, check for language-specific or standard fields
  if (typeof input === "object" && input !== null) {
    const obj = input as Record<string, unknown>;

    // Check for language-specific field
    if (obj[lang]) {
      if (Array.isArray(obj[lang])) {
        return (obj[lang] as unknown[])
          .map((v) => (typeof v === "string" ? v : null))
          .filter((s): s is string => s !== null);
      }
      if (typeof obj[lang] === "string") return [String(obj[lang])];
    }

    // English fallback
    if (obj.en) {
      if (Array.isArray(obj.en)) {
        return (obj.en as unknown[])
          .map((v) => (typeof v === "string" ? v : null))
          .filter((s): s is string => s !== null);
      }
      if (typeof obj.en === "string") return [String(obj.en)];
    }

    // Check for direct array properties that might contain instructions
    const possibleArrayFields = ["items", "list", "steps", "instructions"];
    for (const field of possibleArrayFields) {
      if (Array.isArray(obj[field])) {
        return normalizeInstructions(obj[field], lang);
      }
    }
  }

  // Return empty array instead of stringifying objects
  return [];
}

/**
 * Returns Tailwind CSS classes for difficulty badge
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
 * Returns emoji icon for task category
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
