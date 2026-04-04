"use client";

import React, { useEffect, useState } from "react";
import { Scroll, Lock, Play, CheckCircle, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

interface MilestoneQuest {
  id: string;
  name: string;
  description: string;
  required_level: number;
  skills_tested: string[];
  xp_reward: number;
  status: "locked" | "available" | "active" | "completed";
}

interface QuestLogProps {
  careerId: string;
  userLevel: number;
  language?: string;
}

const statusConfig = {
  locked: { icon: Lock, color: "text-gray-400", bg: "bg-gray-100", border: "border-gray-200" },
  available: { icon: Play, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200" },
  active: { icon: Star, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-200" },
  completed: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50", border: "border-green-200" },
};

export default function QuestLog({ careerId, userLevel, language = "en" }: QuestLogProps) {
  const { t } = useTranslation("discovery");
  const [quests, setQuests] = useState<MilestoneQuest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuests = async () => {
      try {
        // Load YAML quest definitions via skill-tree API (which loads YAML)
        const res = await fetch(`/api/discovery/user/skill-tree/${careerId}?lang=${language}`);
        const json = await res.json();

        // For now, load quests from the YAML data embedded in the response
        // In a full implementation, this would come from its own endpoint
        if (json.success && json.quests) {
          setQuests(json.quests);
        }
      } catch (err) {
        console.error("Failed to load quests:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuests();
  }, [careerId, language]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  if (quests.length === 0) {
    return (
      <div className="text-center py-8">
        <Scroll className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">{t("questLog.noQuests", "No quests available yet")}</p>
        <p className="text-sm text-gray-400 mt-1">
          {t("questLog.keepLearning", "Keep learning to unlock quests")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {quests.map((quest, index) => {
        const config = statusConfig[quest.status];
        const Icon = config.icon;
        const isAccessible = quest.status !== "locked";

        return (
          <motion.div
            key={quest.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`
              p-4 rounded-xl border transition-all
              ${config.border} ${config.bg}
              ${!isAccessible ? "opacity-60" : ""}
            `}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 mt-0.5 ${config.color}`}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`font-medium text-sm ${isAccessible ? "text-gray-900" : "text-gray-500"}`}>
                    {quest.name}
                  </h4>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                    {quest.status === "locked"
                      ? `Lv.${quest.required_level}`
                      : quest.status === "completed"
                        ? t("questLog.completed", "Completed")
                        : quest.status === "active"
                          ? t("questLog.active", "Active")
                          : t("questLog.available", "Available")}
                  </span>
                </div>

                <p className={`text-xs mt-1 ${isAccessible ? "text-gray-600" : "text-gray-400"}`}>
                  {quest.description}
                </p>

                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="text-yellow-600 font-medium">
                    +{quest.xp_reward} XP
                  </span>
                  {quest.skills_tested.length > 0 && (
                    <span className="text-gray-400">
                      {t("questLog.skills", "Skills")}: {quest.skills_tested.join(", ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
