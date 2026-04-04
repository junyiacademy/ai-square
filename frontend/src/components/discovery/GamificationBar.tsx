"use client";

import React from "react";
import { Flame, Trophy, Zap } from "lucide-react";
import { motion } from "framer-motion";
import type { GamificationProfile } from "@/lib/services/discovery/gamification-types";

interface GamificationBarProps {
  profile: GamificationProfile;
  compact?: boolean;
}

export default function GamificationBar({ profile, compact = false }: GamificationBarProps) {
  const xpProgress =
    profile.xpToNextLevel > 0
      ? ((500 - profile.xpToNextLevel) / 500) * 100
      : 100;

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm">
        {/* Level */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 rounded-full">
          <Zap className="w-3.5 h-3.5 text-purple-600" />
          <span className="font-semibold text-purple-700">Lv.{profile.level}</span>
        </div>

        {/* XP bar (mini) */}
        <div className="flex items-center gap-2">
          <div className="w-16 bg-gray-200 rounded-full h-1.5">
            <motion.div
              className="bg-purple-500 h-1.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-xs text-gray-500">{profile.totalXp} XP</span>
        </div>

        {/* Streak */}
        {profile.streak.currentStreak > 0 && (
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{profile.streak.currentStreak}</span>
          </div>
        )}

        {/* Achievement count */}
        {profile.achievements.length > 0 && (
          <div className="flex items-center gap-1 text-yellow-600">
            <Trophy className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{profile.achievements.length}</span>
          </div>
        )}
      </div>
    );
  }

  // Full version
  return (
    <div className="flex items-center gap-4">
      {/* Level Badge */}
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
          {profile.level}
        </div>
        <div>
          <div className="text-xs text-gray-500">Level</div>
          <div className="text-sm font-semibold text-gray-900">{profile.totalXp} XP</div>
        </div>
      </div>

      {/* XP Progress */}
      <div className="flex-1 max-w-[120px]">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {profile.xpToNextLevel} XP to next
        </div>
      </div>

      {/* Streak */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-lg">
        <Flame className={`w-4 h-4 ${profile.streak.currentStreak > 0 ? "text-orange-500" : "text-gray-300"}`} />
        <span className={`text-sm font-medium ${profile.streak.currentStreak > 0 ? "text-orange-700" : "text-gray-400"}`}>
          {profile.streak.currentStreak}
        </span>
      </div>

      {/* Achievements */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 rounded-lg">
        <Trophy className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-medium text-yellow-700">
          {profile.achievements.length}
        </span>
      </div>
    </div>
  );
}
