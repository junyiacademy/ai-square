/**
 * NodeDetailsPanel - Details panel for selected graph nodes
 * Extracted from KSAKnowledgeGraph.tsx
 */

"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { GraphNode } from "./graph-types";
import { getScoreColorClass, getScoreStatus } from "./graph-constants";

interface NodeDetailsPanelProps {
  selectedNode: GraphNode | null;
  onClose: () => void;
  ksaMapping?: {
    [ksa: string]: {
      code: string;
      description: string;
      level?: string;
    };
  };
}

export default function NodeDetailsPanel({
  selectedNode,
  onClose,
  ksaMapping,
}: NodeDetailsPanelProps) {
  const { t } = useTranslation("ksa");

  if (!selectedNode || selectedNode.score === undefined) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 h-full flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
            />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            Click on a KSA node to view details
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Select any colored node in the knowledge graph
          </p>
        </div>
      </div>
    );
  }

  const status = getScoreStatus(selectedNode.score);

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
            {selectedNode.id}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {selectedNode.category === "knowledge" && t("knowledgeComponent")}
            {selectedNode.category === "skills" && t("skillsComponent")}
            {selectedNode.category === "attitudes" && t("attitudesComponent")}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div
          className={`text-5xl font-bold ${getScoreColorClass(selectedNode.score)}`}
        >
          {selectedNode.score}%
        </div>
        <div
          className={`px-4 py-2 rounded-full text-sm font-medium ${status.color}`}
        >
          <span className="mr-1 text-lg">{status.icon}</span>
          {status.text}
        </div>
      </div>

      {ksaMapping?.[selectedNode.id] && (
        <div className="mb-6">
          <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
            Description
          </h5>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {ksaMapping[selectedNode.id].description}
          </p>
          {ksaMapping[selectedNode.id].level && (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium">Level:</span>{" "}
              {ksaMapping[selectedNode.id].level}
            </p>
          )}
        </div>
      )}

      <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          This competency is part of your AI literacy{" "}
          <span className="font-medium">{selectedNode.category}</span>{" "}
          assessment.
        </p>

        {selectedNode.score < 80 && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
            <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>
                Consider practicing more scenarios that focus on this competency
                to improve your score.
              </span>
            </p>
          </div>
        )}

        {selectedNode.score >= 80 && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
            <p className="text-sm text-green-800 dark:text-green-200 flex items-start gap-2">
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                Excellent performance! You have demonstrated strong competency
                in this area.
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
