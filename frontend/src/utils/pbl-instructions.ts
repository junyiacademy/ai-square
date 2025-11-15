/**
 * PBL Task Instructions Processing Utilities
 * Handles different formats of instructions from YAML files
 */

export type InstructionsInput = string | string[] | Record<string, string | string[]> | null | undefined;

/**
 * Process instructions from various formats into a standardized array format
 * @param templateInstructions - Raw instructions from YAML/API
 * @param language - Current language code (e.g., 'zhTW', 'en')
 * @returns Array of instruction strings
 */
export function processInstructions(
  templateInstructions: InstructionsInput,
  language = 'en'
): string[] {
  // Handle null/undefined
  if (!templateInstructions) {
    return [];
  }

  // Handle different types of instructions
  if (Array.isArray(templateInstructions)) {
    // If it's already an array, return it
    return templateInstructions;
  } else if (typeof templateInstructions === 'string') {
    // If it's a string, split by newlines
    return templateInstructions.split('\n').filter((line: string) => line.trim());
  } else if (typeof templateInstructions === 'object' && templateInstructions !== null) {
    // If it's a multilingual object, get the text for current language
    const instructionText = templateInstructions[language] || templateInstructions.en || '';
    if (typeof instructionText === 'string') {
      // Split by newline to create array (instructions are usually multiline)
      return instructionText.split('\n').filter((line: string) => line.trim());
    } else if (Array.isArray(instructionText)) {
      return instructionText;
    }
  }

  // Fallback to empty array
  return [];
}

/**
 * Extract and process description from template data
 */
export function processDescription(
  templateDescription: string | Record<string, string> | null | undefined,
  language = 'en'
): string {
  if (!templateDescription) {
    return '';
  }

  if (typeof templateDescription === 'object' && templateDescription !== null) {
    return templateDescription[language] || templateDescription.en || '';
  }

  return typeof templateDescription === 'string' ? templateDescription : '';
}

/**
 * Extract and process expected outcome from template data
 */
export function processExpectedOutcome(
  templateOutcome: string | Record<string, string> | null | undefined,
  language = 'en'
): string {
  if (!templateOutcome) {
    return '';
  }

  if (typeof templateOutcome === 'object' && !Array.isArray(templateOutcome) && templateOutcome !== null) {
    return templateOutcome[language] || templateOutcome.en || '';
  }

  return typeof templateOutcome === 'string' ? templateOutcome : '';
}
