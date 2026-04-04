"use client";

import React, { useEffect, useState } from "react";
import { Globe, Sparkles, BookOpen, Map } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import SkillTree from "./SkillTree";
import QuestLog from "./QuestLog";

interface WorldData {
  name: string;
  description: string;
  atmosphere: string;
  visual_theme: string;
}

interface WorldOverviewProps {
  careerId: string;
  worldSetting?: WorldData;
  userLevel: number;
  language?: string;
}

type Tab = "world" | "skills" | "quests";

export default function WorldOverview({
  careerId,
  worldSetting,
  userLevel,
  language = "en",
}: WorldOverviewProps) {
  const { t } = useTranslation("discovery");
  const [activeTab, setActiveTab] = useState<Tab>("world");

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "world", label: t("world.tabWorld", "World"), icon: Globe },
    { id: "skills", label: t("world.tabSkills", "Skills"), icon: Sparkles },
    { id: "quests", label: t("world.tabQuests", "Quests"), icon: BookOpen },
  ];

  // Get theme-based gradient
  const themeGradient = getThemeGradient(worldSetting?.visual_theme);

  return (
    <div className="space-y-6">
      {/* World Header */}
      {worldSetting && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-6 text-white ${themeGradient}`}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Map className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{worldSetting.name}</h2>
              <p className="text-white/80 text-sm mt-2 leading-relaxed max-w-2xl">
                {worldSetting.description.trim()}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-white/15 rounded-full text-xs">
                <Sparkles className="w-3 h-3" />
                {worldSetting.atmosphere.replace(/_/g, " ")}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px
                ${isActive ? "border-purple-600 text-purple-600" : "border-transparent text-gray-500 hover:text-gray-700"}
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === "world" && worldSetting && (
          <WorldTab worldSetting={worldSetting} />
        )}
        {activeTab === "skills" && (
          <SkillTree careerId={careerId} language={language} />
        )}
        {activeTab === "quests" && (
          <QuestLog careerId={careerId} userLevel={userLevel} language={language} />
        )}
      </div>
    </div>
  );
}

function WorldTab({ worldSetting }: { worldSetting: WorldData }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-2">About This World</h3>
        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
          {worldSetting.description.trim()}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Atmosphere
          </h4>
          <p className="text-sm font-medium text-gray-900">
            {worldSetting.atmosphere.replace(/_/g, " ")}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Visual Theme
          </h4>
          <p className="text-sm font-medium text-gray-900">
            {worldSetting.visual_theme.replace(/_/g, " ")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function getThemeGradient(visualTheme?: string): string {
  switch (visualTheme) {
    case "digital_temple":
      return "bg-gradient-to-r from-indigo-600 to-purple-600";
    case "cyber_dojo":
    case "digital_dojo":
      return "bg-gradient-to-r from-cyan-600 to-blue-600";
    case "biotech_lab":
    case "floating_lab":
      return "bg-gradient-to-r from-emerald-600 to-teal-600";
    case "creative_studio":
    case "media_studio":
      return "bg-gradient-to-r from-pink-600 to-rose-600";
    case "quantum_realm":
      return "bg-gradient-to-r from-violet-600 to-fuchsia-600";
    case "robot_workshop":
    case "factory_floor":
      return "bg-gradient-to-r from-orange-600 to-amber-600";
    case "trading_floor":
    case "startup_garage":
      return "bg-gradient-to-r from-blue-600 to-indigo-600";
    default:
      return "bg-gradient-to-r from-purple-600 to-blue-600";
  }
}
