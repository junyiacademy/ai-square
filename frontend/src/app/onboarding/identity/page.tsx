"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

const identityOptions = [
  {
    id: "student",
    icon: "🎓",
    titleKey: "identity.student.title",
    descriptionKey: "identity.student.description",
    color: "blue",
  },
  {
    id: "teacher",
    icon: "👨‍🏫",
    titleKey: "identity.teacher.title",
    descriptionKey: "identity.teacher.description",
    color: "green",
  },
  {
    id: "professional",
    icon: "💼",
    titleKey: "identity.professional.title",
    descriptionKey: "identity.professional.description",
    color: "purple",
  },
  {
    id: "learner",
    icon: "✨",
    titleKey: "identity.learner.title",
    descriptionKey: "identity.learner.description",
    color: "orange",
  },
];

export default function IdentityPage() {
  const { t } = useTranslation("onboarding");
  const router = useRouter();
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedIdentity) return;

    setLoading(true);

    try {
      // Get current user data
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);

        // Update user role based on selection
        const roleMap: { [key: string]: string } = {
          student: "student",
          teacher: "teacher",
          professional: "professional",
          learner: "student", // Default learners to student role
        };

        user.role = roleMap[selectedIdentity] || "student";
        user.identity = selectedIdentity;

        // Save updated user data
        localStorage.setItem("user", JSON.stringify(user));

        // Update progress in GCS
        await fetch("/api/users/update-progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
            stage: "identity",
            data: { identity: selectedIdentity },
          }),
        });
      }

      // Navigate to goals page
      router.push("/onboarding/goals");
    } catch (error) {
      console.error("Error saving identity:", error);
    } finally {
      setLoading(false);
    }
  };

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors: {
      [key: string]: { border: string; bg: string; text: string };
    } = {
      blue: {
        border: isSelected ? "border-blue-500" : "border-gray-200",
        bg: isSelected ? "bg-blue-50" : "bg-white",
        text: "text-blue-600",
      },
      green: {
        border: isSelected ? "border-green-500" : "border-gray-200",
        bg: isSelected ? "bg-green-50" : "bg-white",
        text: "text-green-600",
      },
      purple: {
        border: isSelected ? "border-purple-500" : "border-gray-200",
        bg: isSelected ? "bg-purple-50" : "bg-white",
        text: "text-purple-600",
      },
      orange: {
        border: isSelected ? "border-orange-500" : "border-gray-200",
        bg: isSelected ? "bg-orange-50" : "bg-white",
        text: "text-orange-600",
      },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0363A7]/5 to-[#0363A7]/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-[#0363A7] rounded-full flex items-center justify-center text-white text-sm font-medium">
                1
              </div>
              <span className="ml-2 text-sm text-gray-600">
                {t("progress.welcome")}
              </span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-[#0363A7] rounded-full flex items-center justify-center text-white text-sm font-medium">
                2
              </div>
              <span className="ml-2 text-sm font-medium text-gray-900">
                {t("progress.identity")}
              </span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-sm font-medium">
                3
              </div>
              <span className="ml-2 text-sm text-gray-500">
                {t("progress.goals")}
              </span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {t("identity.title", "Who are you?")}
            </h1>
            <p className="text-lg text-gray-600">
              {t(
                "identity.subtitle",
                "Help us personalize your AI learning journey",
              )}
            </p>
          </div>

          {/* Identity options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {identityOptions.map((option) => {
              const isSelected = selectedIdentity === option.id;
              const colors = getColorClasses(option.color, isSelected);

              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedIdentity(option.id)}
                  className={`p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${colors.border} ${colors.bg}`}
                >
                  <div className="flex items-start space-x-4">
                    <div
                      className={`p-3 rounded-lg bg-white shadow-sm flex items-center justify-center`}
                    >
                      <span className="text-3xl">{option.icon}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {t(option.titleKey)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t(option.descriptionKey)}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="mt-4 flex justify-end">
                      <div
                        className={`w-6 h-6 rounded-full ${colors.text.replace("text", "bg")} flex items-center justify-center`}
                      >
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
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => router.push("/onboarding/welcome")}
              className="px-6 py-3 text-gray-700 hover:text-gray-900 transition-colors"
            >
              {t("button.back", "Back")}
            </button>
            <button
              onClick={handleContinue}
              disabled={!selectedIdentity || loading}
              className={`px-8 py-3 rounded-full font-medium transition-all duration-200 ${
                selectedIdentity && !loading
                  ? "bg-[#0363A7] text-white hover:bg-[#0363A7]/90 shadow-md hover:shadow-lg"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {loading
                ? t("button.saving", "Saving...")
                : t("button.continue", "Continue")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
