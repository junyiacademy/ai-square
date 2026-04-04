"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Zap,
  Trophy,
  Flame,
  Star,
  Lock,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Compass,
} from "lucide-react";
import DiscoveryPageLayout from "@/components/discovery/DiscoveryPageLayout";
import StreakBadge from "@/components/discovery/StreakBadge";
import { useGamificationProfile } from "@/hooks/useGamificationProfile";
import type { EarnedAchievement } from "@/lib/services/discovery/gamification-types";

// ── Level names ─────────────────────────────────────────────────────────────��──
const LEVEL_NAMES: Record<number, { zh: string; en: string }> = {
  1: { zh: "見習技師", en: "Apprentice Technician" },
  2: { zh: "學徒工程師", en: "Junior Engineer" },
  3: { zh: "初級工程師", en: "Associate Engineer" },
  4: { zh: "中級工程師", en: "Mid-level Engineer" },
  5: { zh: "資深工程師", en: "Senior Engineer" },
  6: { zh: "專家", en: "Expert" },
  7: { zh: "大師", en: "Master" },
  8: { zh: "傳說", en: "Legend" },
  9: { zh: "先驅者", en: "Pioneer" },
  10: { zh: "創世者", en: "Creator" },
};

function getLevelName(level: number, lang: string): string {
  const capped = Math.min(level, 10);
  const entry = LEVEL_NAMES[capped] ?? LEVEL_NAMES[10];
  return lang.startsWith("zh") ? entry.zh : entry.en;
}

// ── Skill-tree data shapes ─────────────────────────────────────────────────────
interface SkillProgress {
  level: number;
  maxLevel: number;
  xp: number;
  lastPracticedAt: string | null;
}

interface SkillTreeNode {
  id: string;
  name: string;
  description: string;
  max_level: number;
  requires?: string[];
  progress: SkillProgress;
  isCore: boolean;
  isUnlocked: boolean;
}

interface SkillTreeData {
  careerId: string;
  careerName?: string;
  nodes: SkillTreeNode[];
}

// ── Badge colour helper ───────────────────────────────────────────────────────
const BADGE_COLORS: Record<string, string> = {
  bronze: "from-amber-600 to-amber-400",
  silver: "from-gray-400 to-gray-300",
  gold: "from-yellow-500 to-yellow-300",
  platinum: "from-purple-500 to-blue-400",
  badge: "from-purple-500 to-blue-400",
  milestone: "from-green-500 to-teal-400",
  career: "from-blue-500 to-indigo-400",
  exploration: "from-teal-500 to-cyan-400",
  mastery: "from-orange-500 to-amber-400",
  special: "from-pink-500 to-rose-400",
};

function badgeGradient(achievement: EarnedAchievement): string {
  return (
    BADGE_COLORS[achievement.type] ??
    BADGE_COLORS["badge"]
  );
}

// ── XP progress within current level ─────────────────────────────────────────
const XP_PER_LEVEL = 500;

function xpInCurrentLevel(totalXp: number): number {
  return totalXp % XP_PER_LEVEL;
}

function xpProgressPercent(totalXp: number): number {
  return (xpInCurrentLevel(totalXp) / XP_PER_LEVEL) * 100;
}

// ── Stat card ──────────────────────────────────────────────────────��──────────
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center p-4 rounded-2xl border shadow-sm bg-white gap-1`}
    >
      <div className={`${color} p-2 rounded-full`}>{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 font-medium text-center">{label}</div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation("discovery");
  const { profile, loading } = useGamificationProfile();

  // skill trees keyed by careerId
  const [skillTrees, setSkillTrees] = useState<Record<string, SkillTreeData>>({});
  const [expandedCareer, setExpandedCareer] = useState<string | null>(null);

  // Careers the user has any skill progress in
  const careerIds = Object.keys(profile.skillProgress);

  // Fetch skill trees for all careers with progress
  useEffect(() => {
    if (careerIds.length === 0) return;
    const lang = i18n.language || "en";

    careerIds.forEach(async (careerId) => {
      if (skillTrees[careerId]) return; // already loaded
      try {
        const res = await fetch(
          `/api/discovery/user/skill-tree/${careerId}?lang=${lang}`,
        );
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.skillTree) {
          setSkillTrees((prev) => ({ ...prev, [careerId]: json.skillTree }));
        }
      } catch {
        // ignore
      }
    });
  }, [careerIds.join(","), i18n.language]); // eslint-disable-line react-hooks/exhaustive-deps

  const levelName = getLevelName(profile.level, i18n.language);
  const progressPercent = xpProgressPercent(profile.totalXp);
  const xpInLevel = xpInCurrentLevel(profile.totalXp);

  if (loading) {
    return (
      <DiscoveryPageLayout>
        <div className="max-w-5xl mx-auto py-16 text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{t("status.loading")}</p>
        </div>
      </DiscoveryPageLayout>
    );
  }

  return (
    <DiscoveryPageLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-16">

        {/* ── Page heading ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t("gamification.overview.heading")}
            </h2>
          </div>
          <StreakBadge streak={profile.streak} size="md" />
        </motion.div>

        {/* ── Level & XP progress bar ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center gap-4 mb-4">
            {/* Level badge */}
            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-white/20 flex flex-col items-center justify-center">
              <Zap className="w-5 h-5 text-yellow-300 mb-0.5" />
              <span className="text-xl font-black">{profile.level}</span>
            </div>
            <div className="flex-1">
              <p className="text-purple-200 text-sm font-medium">
                {t("gamification.currentLevel")}
              </p>
              <p className="text-xl font-bold">{levelName}</p>
            </div>
            <div className="text-right">
              <p className="text-purple-200 text-xs">{t("gamification.totalXp")}</p>
              <p className="text-lg font-bold">{profile.totalXp.toLocaleString()} XP</p>
            </div>
          </div>

          {/* XP bar */}
          <div className="w-full bg-white/20 rounded-full h-3 mb-1">
            <motion.div
              className="h-3 rounded-full bg-yellow-300"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <div className="flex justify-between text-xs text-purple-200">
            <span>{xpInLevel} XP</span>
            <span>
              {t("gamification.xpToNext", { xp: profile.xpToNextLevel })}
            </span>
          </div>
        </motion.div>

        {/* ── 4 Quick-stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<Zap className="w-5 h-5 text-purple-600" />}
            label={t("gamification.overview.statsXp")}
            value={profile.totalXp.toLocaleString()}
            color="bg-purple-100"
          />
          <StatCard
            icon={<Star className="w-5 h-5 text-blue-600" />}
            label={t("gamification.overview.statsLevel")}
            value={profile.level}
            color="bg-blue-100"
          />
          <StatCard
            icon={<Trophy className="w-5 h-5 text-yellow-600" />}
            label={t("gamification.overview.statsAchievements")}
            value={profile.achievements.length}
            color="bg-yellow-100"
          />
          <StatCard
            icon={<Flame className="w-5 h-5 text-orange-600" />}
            label={t("gamification.overview.statsStreak")}
            value={
              profile.streak.currentStreak > 0
                ? t("gamification.streakDays", { n: profile.streak.currentStreak })
                : "0"
            }
            color="bg-orange-100"
          />
        </div>

        {/* ── Career progress + skill trees ── */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {t("gamification.overview.careerProgress")}
          </h3>

          {careerIds.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
              <Compass className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">
                {t("gamification.overview.noCareerStarted")}
              </p>
              <button
                onClick={() => router.push("/discovery/scenarios")}
                className="px-5 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                {t("gamification.overview.goExplore")}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {careerIds.map((careerId, idx) => {
                const careerSkills = profile.skillProgress[careerId] ?? {};
                const totalSkills = Object.keys(careerSkills).length;
                const masteredSkills = Object.values(careerSkills).filter(
                  (s) => s.level >= s.maxLevel,
                ).length;
                const pct =
                  totalSkills > 0
                    ? Math.round((masteredSkills / totalSkills) * 100)
                    : 0;
                const isExpanded = expandedCareer === careerId;
                const tree = skillTrees[careerId];

                return (
                  <motion.div
                    key={careerId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                  >
                    {/* Career header / toggle */}
                    <button
                      className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
                      onClick={() =>
                        setExpandedCareer(isExpanded ? null : careerId)
                      }
                    >
                      {/* Progress ring */}
                      <div className="relative flex-shrink-0 w-12 h-12">
                        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
                          <circle
                            cx="22"
                            cy="22"
                            r="18"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="4"
                          />
                          <circle
                            cx="22"
                            cy="22"
                            r="18"
                            fill="none"
                            stroke="#9333ea"
                            strokeWidth="4"
                            strokeDasharray={`${(pct / 100) * 113} 113`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-purple-700">
                          {pct}%
                        </span>
                      </div>

                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 capitalize">
                          {careerId.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t("gamification.overview.completionPercent", {
                            pct,
                          })}
                          {" · "}
                          {totalSkills} {t("skillTree.coreSkills").toLowerCase()}{" "}
                          / {masteredSkills} mastered
                        </p>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {/* Expanded skill tree */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-gray-100 p-5"
                      >
                        {tree ? (
                          <SkillGrid tree={tree} />
                        ) : (
                          <div className="text-center py-6 text-gray-400 text-sm">
                            {t("status.loading")}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Recent achievements ── */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {t("gamification.overview.recentAchievements")}
          </h3>

          {profile.achievements.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-400">
              <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>{t("gamification.noAchievements")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[...profile.achievements]
                .sort(
                  (a, b) =>
                    new Date(b.earnedAt).getTime() -
                    new Date(a.earnedAt).getTime(),
                )
                .slice(0, 9)
                .map((ach, idx) => (
                  <AchievementCard key={ach.id} achievement={ach} index={idx} />
                ))}
            </div>
          )}
        </section>
      </div>
    </DiscoveryPageLayout>
  );
}

// ── Skill grid sub-component ──────────────────────────────────��──────────────
function SkillGrid({ tree }: { tree: SkillTreeData }) {
  const { t } = useTranslation("discovery");

  const coreSkills = tree.nodes.filter((n) => n.isCore);
  const advancedSkills = tree.nodes.filter((n) => !n.isCore);

  return (
    <div className="space-y-5">
      {coreSkills.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {t("gamification.overview.coreSkills")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {coreSkills.map((skill, i) => (
              <SkillCard key={skill.id} skill={skill} index={i} />
            ))}
          </div>
        </div>
      )}
      {advancedSkills.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {t("gamification.overview.advancedSkills")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {advancedSkills.map((skill, i) => (
              <SkillCard key={skill.id} skill={skill} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SkillCard({
  skill,
  index,
}: {
  skill: SkillTreeNode;
  index: number;
}) {
  const pct =
    skill.progress.maxLevel > 0
      ? (skill.progress.level / skill.progress.maxLevel) * 100
      : 0;
  const complete = skill.progress.level >= skill.progress.maxLevel;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`rounded-xl border p-3 transition-all ${
        !skill.isUnlocked
          ? "opacity-50 bg-gray-50 border-gray-200"
          : complete
          ? "bg-green-50 border-green-200"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {!skill.isUnlocked ? (
          <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : complete ? (
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
        ) : (
          <Circle className="w-4 h-4 text-purple-400 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-gray-900 flex-1 truncate">
          {skill.name}
        </span>
        <span className="text-xs text-gray-500 flex-shrink-0">
          Lv.{skill.progress.level}/{skill.progress.maxLevel}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <motion.div
          className={`h-1.5 rounded-full ${
            complete ? "bg-green-500" : "bg-purple-500"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, delay: index * 0.04 + 0.1 }}
        />
      </div>

      {/* Level dots */}
      <div className="flex gap-1 mt-1.5">
        {Array.from({ length: skill.progress.maxLevel }, (_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${
              i < skill.progress.level ? "bg-purple-500" : "bg-gray-200"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── Achievement card ───────────────────────────────────────────────���─────────
function AchievementCard({
  achievement,
  index,
}: {
  achievement: EarnedAchievement;
  index: number;
}) {
  const { t } = useTranslation("discovery");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        {/* Badge icon */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${badgeGradient(achievement)} flex items-center justify-center shadow-sm`}
        >
          <Trophy className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {achievement.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {achievement.description}
          </p>
          <p className="text-xs text-purple-600 font-medium mt-1">
            +{achievement.xpReward} XP
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        {t("gamification.earnedOn", {
          date: new Date(achievement.earnedAt).toLocaleDateString(),
        })}
      </p>
    </motion.div>
  );
}
