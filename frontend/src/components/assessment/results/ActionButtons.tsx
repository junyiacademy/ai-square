import { AssessmentResult } from "@/types/assessment";
import type { CurrentUser } from "@/hooks/assessment/useCurrentUser";

interface ActionButtonsProps {
  currentUser: CurrentUser | null;
  isSaved: boolean;
  isSaving: boolean;
  isReview: boolean;
  result: AssessmentResult;
  onRetake: () => void;
  onSave: () => void;
  t: (key: string) => string;
}

export function ActionButtons({
  currentUser,
  isSaved,
  isSaving,
  isReview,
  result,
  onRetake,
  onSave,
  t,
}: ActionButtonsProps) {
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center gap-4 flex-wrap">
        {!isReview && (!currentUser || !isSaved) && (
          <button
            onClick={onSave}
            disabled={isSaving || isSaved}
            className={`px-8 py-3 rounded-lg font-medium transition-colors ${
              isSaved
                ? "bg-green-600 text-white cursor-not-allowed"
                : isSaving
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isSaving ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {t("results.saving")}
              </span>
            ) : isSaved ? (
              <span className="flex items-center">
                <svg
                  className="mr-2 h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {t("results.saved")}
              </span>
            ) : (
              t("results.saveResults")
            )}
          </button>
        )}
        {currentUser && isSaved && (
          <button
            onClick={() => {
              localStorage.setItem("assessmentResult", JSON.stringify(result));
              window.location.href = "/learning-path";
            }}
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center"
          >
            {t("results.viewLearningPath")}
            <svg
              className="ml-2 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        )}
        <button
          onClick={onRetake}
          className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          {t("results.retakeAssessment")}
        </button>
        <button
          onClick={() => window.print()}
          className="bg-gray-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
        >
          {t("results.downloadReport")}
        </button>
      </div>
    </div>
  );
}
