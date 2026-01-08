"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Check,
  GitBranch,
  Save,
  GitPullRequestIcon,
  Sparkles,
} from "lucide-react";

interface ProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: ProcessingStep[];
  currentStep: number;
  commitMessage?: string;
  prDescription?: string;
  branchName?: string;
}

export interface ProcessingStep {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed" | "error";
  error?: string;
}

export function ProcessingModal({
  isOpen,
  onClose,
  steps,
  currentStep,
  commitMessage,
  prDescription,
  branchName,
}: ProcessingModalProps) {
  const [showPrDescription, setShowPrDescription] = useState(false);

  useEffect(() => {
    if (prDescription) {
      // Show PR description after a slight delay for better UX
      setTimeout(() => setShowPrDescription(true), 500);
    }
  }, [prDescription]);

  if (!isOpen) return null;

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.id) {
      case "create-branch":
        return <GitBranch className="w-5 h-5" />;
      case "save-changes":
        return <Save className="w-5 h-5" />;
      case "create-pr":
        return <GitPullRequestIcon className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  const getStepStatusIcon = (status: ProcessingStep["status"]) => {
    switch (status) {
      case "processing":
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case "completed":
        return <Check className="w-5 h-5 text-green-500" />;
      case "error":
        return <span className="text-red-500">✕</span>;
      default:
        return (
          <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Sparkles className="w-6 h-6" />
            AI-Powered Save & Deploy
          </h2>
          <p className="text-blue-100 mt-1">
            Processing your changes with intelligent automation
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Steps Progress */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-start gap-4 transition-all duration-300 ${
                  index > currentStep ? "opacity-40" : ""
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getStepStatusIcon(step.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-lg ${
                        step.status === "processing"
                          ? "bg-blue-100"
                          : step.status === "completed"
                            ? "bg-green-100"
                            : "bg-gray-100"
                      }`}
                    >
                      {getStepIcon(step)}
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      {step.label}
                    </h3>
                  </div>

                  {step.error && (
                    <p className="text-red-600 text-sm mt-2">{step.error}</p>
                  )}

                  {/* Show additional info for specific steps */}
                  {step.id === "create-branch" &&
                    step.status === "completed" &&
                    branchName && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                          <span className="font-medium">Branch created:</span>{" "}
                          {branchName}
                        </p>
                      </div>
                    )}

                  {step.id === "save-changes" &&
                    step.status === "completed" &&
                    commitMessage && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Commit message:
                        </p>
                        <p className="text-sm text-gray-600 font-mono">
                          {commitMessage}
                        </p>
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>

          {/* PR Description Preview */}
          {showPrDescription && prDescription && (
            <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <GitPullRequestIcon className="w-5 h-5 text-indigo-600" />
                  Generated Pull Request Description
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                    {prDescription}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {steps.every((s) => s.status === "completed")
                ? "✨ All tasks completed successfully!"
                : "🤖 AI is processing your request..."}
            </p>
            {steps.every(
              (s) => s.status === "completed" || s.status === "error",
            ) && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
