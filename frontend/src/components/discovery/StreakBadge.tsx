"use client";

import React from "react";
import { Flame } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { UserStreak } from "@/lib/services/discovery/gamification-types";

interface StreakBadgeProps {
  streak: UserStreak;
  size?: "sm" | "md";
}

export default function StreakBadge({ streak, size = "md" }: StreakBadgeProps) {
  const { t } = useTranslation("discovery");

  const today = new Date().toISOString().slice(0, 10);
  const isActiveToday = streak.lastActiveDate === today;
  const hasStreak = streak.currentStreak > 0;

  const isSmall = size === "sm";

  return (
    <div
      className="relative inline-flex items-center"
      title={t("gamification.streakTooltip", { n: streak.longestStreak })}
    >
      <motion.div
        animate={isActiveToday && hasStreak ? { scale: [1, 1.08, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${
          isSmall ? "text-xs" : "text-sm"
        } ${
          isActiveToday && hasStreak
            ? "bg-orange-100 text-orange-700"
            : "bg-gray-100 text-gray-400"
        }`}
      >
        <Flame
          className={`${isSmall ? "w-3 h-3" : "w-4 h-4"} ${
            isActiveToday && hasStreak ? "text-orange-500" : "text-gray-300"
          }`}
        />
        <span className="font-semibold">
          {hasStreak
            ? t("gamification.streakDays", { n: streak.currentStreak })
            : "0"}
        </span>
      </motion.div>
    </div>
  );
}
