/**
 * Normalizes various instruction formats to a string array
 * Acceptable shapes:
 * - string
 * - string[]
 * - Record<string, string> (multilingual)
 * - Record<string, string[]> (multilingual arrays)
 * - Array of objects with text/content/language properties
 *
 * @param input - The instruction data to normalize
 * @param lang - The target language for multilingual content
 * @returns Array of instruction strings
 */
export function normalizeInstructions(input: unknown, lang: string): string[] {
  if (!input) return [];

  // If it's already an array, process each item
  if (Array.isArray(input)) {
    return input
      .map((v) => {
        if (typeof v === 'string') return v;
        if (typeof v === 'object' && v !== null) {
          // Check for text property
          if ('text' in v) return String((v as Record<string, unknown>).text);
          // Check for multilingual object
          if (lang in v) return String((v as Record<string, unknown>)[lang]);
          if ('en' in v) return String((v as Record<string, unknown>).en);
          // Check for content property
          if ('content' in v) return String((v as Record<string, unknown>).content);
        }
        // Don't stringify objects - skip them
        return null;
      })
      .filter((s): s is string => s !== null && s.trim().length > 0);
  }

  // If it's a single string, return as array
  if (typeof input === 'string') return [input];

  // If it's an object, check for language-specific or standard fields
  if (typeof input === 'object' && input !== null) {
    const obj = input as Record<string, unknown>;

    // Check for language-specific field
    if (obj[lang]) {
      if (Array.isArray(obj[lang])) {
        return (obj[lang] as unknown[])
          .map(v => typeof v === 'string' ? v : null)
          .filter((s): s is string => s !== null);
      }
      if (typeof obj[lang] === 'string') return [String(obj[lang])];
    }

    // English fallback
    if (obj.en) {
      if (Array.isArray(obj.en)) {
        return (obj.en as unknown[])
          .map(v => typeof v === 'string' ? v : null)
          .filter((s): s is string => s !== null);
      }
      if (typeof obj.en === 'string') return [String(obj.en)];
    }

    // Check for direct array properties that might contain instructions
    const possibleArrayFields = ['items', 'list', 'steps', 'instructions'];
    for (const field of possibleArrayFields) {
      if (Array.isArray(obj[field])) {
        return normalizeInstructions(obj[field], lang);
      }
    }
  }

  // Return empty array instead of stringifying objects
  return [];
}
