"use client";

import { useTranslation } from "react-i18next";

interface QuizHeaderProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  timeLeft: number;
}

export function QuizHeader({
  currentQuestionIndex,
  totalQuestions,
  timeLeft,
}: QuizHeaderProps) {
  const { t } = useTranslation("assessment");

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const progressPercentage =
    ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{t("quiz.title")}</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            {t("quiz.question")} {currentQuestionIndex + 1} / {totalQuestions}
          </div>
          <div
            className={`text-sm font-medium ${timeLeft < 300 ? "text-red-600" : "text-gray-600"}`}
          >
            {t("quiz.timeLeft")}: {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
    </div>
  );
}
