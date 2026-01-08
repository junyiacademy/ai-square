/**
 * StarRating Component
 *
 * Shared component for displaying star ratings based on score.
 * Extracted from duplicate implementations to follow DRY principles.
 *
 * Scoring Thresholds:
 * - Perfect (3 stars): score >= 91
 * - Great (2 stars): score 71-90
 * - Good (1 star): score < 71
 *
 * @module components/shared/StarRating
 */

/**
 * Calculate star rating based on score
 * @param score - Numeric score (0-100)
 * @returns Object with filled and empty star counts
 */
export function getStarRating(score: number): {
  filled: number;
  empty: number;
} {
  if (score >= 91) return { filled: 3, empty: 0 };
  if (score >= 71) return { filled: 2, empty: 1 };
  return { filled: 1, empty: 2 };
}

export interface StarRatingProps {
  /** Score value (0-100) */
  score: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

/**
 * StarRating Component
 *
 * Renders visual star rating based on score.
 *
 * @example
 * ```tsx
 * <StarRating score={95} size="md" />
 * ```
 */
export function StarRating({ score, size = "md" }: StarRatingProps) {
  const { filled, empty } = getStarRating(score);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const starClass = sizeClasses[size];

  return (
    <div className="flex items-center gap-0.5">
      {/* Filled stars */}
      {[...Array(filled)].map((_, i) => (
        <svg
          key={`filled-${i}`}
          className={`${starClass} text-yellow-400 fill-current`}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      {/* Empty stars */}
      {[...Array(empty)].map((_, i) => (
        <svg
          key={`empty-${i}`}
          className={`${starClass} text-gray-300 dark:text-gray-600 fill-current`}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}
