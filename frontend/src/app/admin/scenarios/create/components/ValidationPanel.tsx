"use client";

/**
 * ValidationPanel Component
 * Real-time validation feedback panel
 */

import { useEffect, useState, useCallback } from "react";
import type {
  ValidateScenarioResponse,
  ValidationError,
} from "@/types/prompt-to-course";

interface ValidationPanelProps {
  yaml: string;
  mode: "pbl" | "discovery" | "assessment";
}

export function ValidationPanel({ yaml, mode }: ValidationPanelProps) {
  const [validationResult, setValidationResult] =
    useState<ValidateScenarioResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateYAML = useCallback(async () => {
    if (!yaml.trim()) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch("/api/scenarios/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yaml, mode }),
      });

      const result = (await response.json()) as ValidateScenarioResponse;
      setValidationResult(result);
    } catch (error) {
      console.error("Validation error:", error);
      setValidationResult({
        valid: false,
        errors: [
          {
            path: "root",
            message:
              "Failed to validate: " +
              (error instanceof Error ? error.message : "Unknown error"),
            severity: "error",
          },
        ],
        warnings: [],
        info: [],
      });
    } finally {
      setIsValidating(false);
    }
  }, [yaml, mode]);

  useEffect(() => {
    // Debounce validation
    const timer = setTimeout(() => {
      validateYAML();
    }, 1000);

    return () => clearTimeout(timer);
  }, [validateYAML]);

  if (!yaml.trim()) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
        No content to validate
      </div>
    );
  }

  if (isValidating) {
    return (
      <div className="bg-blue-50 p-4 rounded-lg text-center">
        <div className="flex items-center justify-center gap-2 text-blue-700">
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
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
          <span>Validating...</span>
        </div>
      </div>
    );
  }

  if (!validationResult) {
    return null;
  }

  const renderValidationItem = (item: ValidationError) => {
    const icons = {
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    };

    const colors = {
      error: "bg-red-50 border-red-200 text-red-800",
      warning: "bg-amber-50 border-amber-200 text-amber-800",
      info: "bg-blue-50 border-blue-200 text-blue-800",
    };

    return (
      <div
        key={`${item.severity}-${item.path}-${item.message}`}
        className={`p-3 border rounded-lg ${colors[item.severity]}`}
      >
        <div className="flex items-start gap-2">
          <span className="text-lg">{icons[item.severity]}</span>
          <div className="flex-1">
            {item.path !== "root" && (
              <div className="text-xs font-mono opacity-70 mb-1">
                {item.path}
              </div>
            )}
            <div className="text-sm">{item.message}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Status Summary */}
      <div
        className={`p-4 rounded-lg border-2 ${
          validationResult.valid
            ? "bg-green-50 border-green-500 text-green-800"
            : "bg-red-50 border-red-500 text-red-800"
        }`}
      >
        <div className="flex items-center gap-2 font-medium">
          <span className="text-2xl">
            {validationResult.valid ? "✅" : "❌"}
          </span>
          <span>
            {validationResult.valid ? "Validation Passed" : "Validation Failed"}
          </span>
        </div>
        <div className="mt-2 text-sm">
          {validationResult.errors.length} errors,{" "}
          {validationResult.warnings.length} warnings,{" "}
          {validationResult.info.length} info
        </div>
      </div>

      {/* Errors */}
      {validationResult.errors.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-red-900">Errors</h4>
          {validationResult.errors.map(renderValidationItem)}
        </div>
      )}

      {/* Warnings */}
      {validationResult.warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-amber-900">Warnings</h4>
          {validationResult.warnings.map(renderValidationItem)}
        </div>
      )}

      {/* Info */}
      {validationResult.info.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-blue-900">Info</h4>
          {validationResult.info.map(renderValidationItem)}
        </div>
      )}
    </div>
  );
}
