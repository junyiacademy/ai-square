"use client";

import { useTranslation } from "react-i18next";
import { AssessmentQuestion } from "../../../types/assessment";

interface QuizQuestionProps {
  question: AssessmentQuestion;
  selectedAnswer: "a" | "b" | "c" | "d" | null;
  hasAnswered: boolean;
  onAnswerSelect: (answer: "a" | "b" | "c" | "d") => void;
}

export function QuizQuestion({
  question,
  selectedAnswer,
  hasAnswered,
  onAnswerSelect,
}: QuizQuestionProps) {
  const { t } = useTranslation("assessment");

  const getDomainName = (domainKey: string) => {
    return t(`domains.${domainKey}`);
  };

  return (
    <div className="flex-1 bg-white rounded-lg shadow-sm p-8">
      <div className="mb-6">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          {getDomainName(question.domain)}
        </span>
        <span className="ml-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
          {t(`difficulty.${question.difficulty}`)}
        </span>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {question.question}
        </h2>
      </div>

      <div className="space-y-4">
        {Object.entries(question.options).map(([key, text]) => {
          const isCorrect = key === question.correct_answer;
          const isSelected = selectedAnswer === key;
          const showResult = hasAnswered;

          return (
            <button
              key={key}
              onClick={() =>
                !hasAnswered && onAnswerSelect(key as "a" | "b" | "c" | "d")
              }
              disabled={hasAnswered}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                showResult && isCorrect
                  ? "border-green-500 bg-green-50"
                  : showResult && isSelected && !isCorrect
                    ? "border-red-500 bg-red-50"
                    : isSelected
                      ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              } ${hasAnswered ? "cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-start">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 mt-0.5 ${
                    showResult && isCorrect
                      ? "border-green-500 bg-green-500"
                      : showResult && isSelected && !isCorrect
                        ? "border-red-500 bg-red-500"
                        : isSelected
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-gray-300"
                  }`}
                >
                  {showResult && isCorrect ? (
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : showResult && isSelected && !isCorrect ? (
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : isSelected ? (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  ) : null}
                </div>
                <div className="flex-1">
                  <span className="font-medium text-gray-700 mr-2">
                    {key.toUpperCase()}.
                  </span>
                  <span
                    className={`${
                      showResult && isCorrect
                        ? "text-green-900 font-medium"
                        : showResult && isSelected && !isCorrect
                          ? "text-red-900"
                          : "text-gray-900"
                    }`}
                  >
                    {text}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
