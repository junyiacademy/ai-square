import { AssessmentResult } from "@/types/assessment";
import { formatDateWithLocale } from "@/utils/locale";

interface ResultsHeaderProps {
  result: AssessmentResult;
  language: string;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function ResultsHeader({ result, language, t }: ResultsHeaderProps) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case "expert":
        return "text-green-700 bg-green-100";
      case "advanced":
        return "text-blue-700 bg-blue-100";
      case "intermediate":
        return "text-yellow-700 bg-yellow-100";
      case "beginner":
        return "text-gray-700 bg-gray-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 55) return "text-yellow-600";
    return "text-red-600";
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
      <div className="text-center">
        <div className="mb-6">
          <div
            className={`text-6xl font-bold mb-2 ${getScoreColor(result.overallScore)}`}
          >
            {result.overallScore}%
          </div>
          <div
            className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-medium ${getLevelColor(result.level)}`}
          >
            {t(`level.${result.level}`)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {result.correctAnswers}/{result.totalQuestions}
            </div>
            <div className="text-sm text-gray-600">
              {t("results.correctAnswers")}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {formatTime(result.timeSpentSeconds)}
            </div>
            <div className="text-sm text-gray-600">
              {t("results.timeSpent")}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {formatDateWithLocale(new Date(result.completedAt), language)}
            </div>
            <div className="text-sm text-gray-600">
              {t("results.completedAt")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
