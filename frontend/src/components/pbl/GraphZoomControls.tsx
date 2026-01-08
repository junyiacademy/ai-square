/**
 * GraphZoomControls - Zoom control buttons for the knowledge graph
 * Extracted from KSAKnowledgeGraph.tsx
 */

"use client";

import React from "react";
import { useTranslation } from "react-i18next";

interface GraphZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export default function GraphZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
}: GraphZoomControlsProps) {
  const { t } = useTranslation("common");

  return (
    <div className="absolute top-2 right-2 flex flex-col gap-1">
      <button
        onClick={onZoomIn}
        className="p-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
        title={t("zoomIn")}
        aria-label={t("zoomIn")}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </button>

      <button
        onClick={onZoomOut}
        className="p-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
        title={t("zoomOut")}
        aria-label={t("zoomOut")}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 12H4"
          />
        </svg>
      </button>

      <button
        onClick={onReset}
        className="p-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
        title={t("resetZoom")}
        aria-label={t("resetZoom")}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      </button>
    </div>
  );
}
