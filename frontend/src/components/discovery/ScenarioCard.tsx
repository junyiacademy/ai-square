"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface ScenarioCardProps {
  scenario: {
    id: string;
    scenarioId: string;
    title: string;
    subtitle: string;
    category: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    color: string;
    skills: string[];
    primaryStatus?: "mastered" | "in-progress" | "new";
    currentProgress?: number;
    stats?: {
      completedCount: number;
      activeCount: number;
      totalAttempts: number;
      bestScore: number;
    };
    lastActivity?: string;
  };
  index: number;
  showLastActivity?: boolean;
  onSelect: (scenario: ScenarioCardProps["scenario"]) => void;
}

export default function ScenarioCard({
  scenario,
  index,
  showLastActivity = false,
  onSelect,
}: ScenarioCardProps) {
  const { t } = useTranslation("skills");
  const Icon = scenario.icon;
  const primaryStatus = scenario.primaryStatus || "new";
  const stats = scenario.stats || {
    completedCount: 0,
    activeCount: 0,
    totalAttempts: 0,
    bestScore: 0,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative"
    >
      <div
        onClick={() => onSelect(scenario)}
        className="cursor-pointer h-full bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-purple-200"
        data-testid="scenario-card"
      >
        {/* Gradient Background */}
        <div className={`h-32 bg-gradient-to-br ${scenario.color} relative`}>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="w-16 h-16 text-white/90" />
          </div>

          {/* Status Badge */}
          {primaryStatus === "mastered" && (
            <div className="absolute top-3 right-3 px-3 py-1 bg-green-100 backdrop-blur rounded-full flex items-center gap-1">
              <span className="text-xs font-medium text-green-700">已達成</span>
              <span className="text-lg">🏆</span>
            </div>
          )}

          {primaryStatus === "in-progress" && (
            <div className="absolute top-3 right-3 px-3 py-1 bg-blue-100 backdrop-blur rounded-full">
              <span className="text-xs font-medium text-blue-700">學習中</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors">
            {scenario.title}
          </h3>
          <p className="text-sm text-gray-600 mb-4">{scenario.subtitle}</p>

          {/* Skills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {scenario.skills.slice(0, 3).map((skill, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
              >
                {t(skill, { defaultValue: skill })}
              </span>
            ))}
            {scenario.skills.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-md">
                +{scenario.skills.length - 3}
              </span>
            )}
          </div>

          {/* Status Display */}
          <div className="space-y-3">
            {/* Primary Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">狀態</span>
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  primaryStatus === "mastered"
                    ? "bg-green-100 text-green-700"
                    : primaryStatus === "in-progress"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                {primaryStatus === "mastered"
                  ? "已達成"
                  : primaryStatus === "in-progress"
                    ? "學習中"
                    : "尚未開始"}
              </div>
            </div>

            {/* Statistics */}
            {stats.totalAttempts > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">總嘗試次數</span>
                  <span className="font-medium">{stats.totalAttempts} 次</span>
                </div>
                {stats.completedCount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">完成次數</span>
                    <span className="font-medium text-green-600">
                      {stats.completedCount} 次
                    </span>
                  </div>
                )}
                {stats.bestScore > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">最佳成績</span>
                    <span className="font-medium">{stats.bestScore}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Last Activity */}
            {showLastActivity && scenario.lastActivity && (
              <div className="text-xs text-gray-500">
                上次活動：
                {new Date(scenario.lastActivity).toLocaleDateString("zh-TW")}
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-4 mt-4 border-t border-gray-100">
            <button className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all">
              {primaryStatus === "in-progress"
                ? "繼續學習"
                : primaryStatus === "mastered"
                  ? "再次挑戰"
                  : "開始冒險"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
