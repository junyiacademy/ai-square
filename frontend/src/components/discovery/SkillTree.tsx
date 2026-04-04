"use client";

import React, { useEffect, useState } from "react";
import { Lock, CheckCircle2, Circle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

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
  unlocks?: string[];
  progress: SkillProgress;
  isCore: boolean;
  isUnlocked: boolean;
}

interface SkillTreeData {
  careerId: string;
  nodes: SkillTreeNode[];
}

interface SkillTreeProps {
  careerId: string;
  language?: string;
}

export default function SkillTree({ careerId, language = "en" }: SkillTreeProps) {
  const { t } = useTranslation("discovery");
  const [data, setData] = useState<SkillTreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<SkillTreeNode | null>(null);

  useEffect(() => {
    const fetchSkillTree = async () => {
      try {
        const res = await fetch(`/api/discovery/user/skill-tree/${careerId}?lang=${language}`);
        const json = await res.json();
        if (json.success) {
          setData(json.skillTree);
        }
      } catch (err) {
        console.error("Failed to load skill tree:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSkillTree();
  }, [careerId, language]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {t("skillTree.noData", "No skill tree available for this career")}
      </div>
    );
  }

  const coreSkills = data.nodes.filter((n) => n.isCore);
  const advancedSkills = data.nodes.filter((n) => !n.isCore);

  return (
    <div className="space-y-6">
      {/* Core Skills */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          {t("skillTree.coreSkills", "Core Skills")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {coreSkills.map((skill, index) => (
            <SkillNode
              key={skill.id}
              skill={skill}
              index={index}
              onClick={() => setSelectedSkill(skill)}
              isSelected={selectedSkill?.id === skill.id}
            />
          ))}
        </div>
      </div>

      {/* Advanced Skills */}
      {advancedSkills.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {t("skillTree.advancedSkills", "Advanced Skills")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {advancedSkills.map((skill, index) => (
              <SkillNode
                key={skill.id}
                skill={skill}
                index={index}
                onClick={() => setSelectedSkill(skill)}
                isSelected={selectedSkill?.id === skill.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Selected Skill Detail */}
      {selectedSkill && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-purple-200 rounded-xl p-4 shadow-sm"
        >
          <h4 className="font-semibold text-gray-900">{selectedSkill.name}</h4>
          <p className="text-sm text-gray-600 mt-1">{selectedSkill.description}</p>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="text-purple-600 font-medium">
              {t("skillTree.level", "Level")}: {selectedSkill.progress.level}/{selectedSkill.progress.maxLevel}
            </span>
            <span className="text-gray-500">
              XP: {selectedSkill.progress.xp}
            </span>
            {selectedSkill.progress.lastPracticedAt && (
              <span className="text-gray-400">
                {t("skillTree.lastPracticed", "Last practiced")}:{" "}
                {new Date(selectedSkill.progress.lastPracticedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          {selectedSkill.requires && selectedSkill.requires.length > 0 && (
            <div className="mt-2 text-xs text-gray-400">
              {t("skillTree.requires", "Requires")}: {selectedSkill.requires.join(", ")}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function SkillNode({
  skill,
  index,
  onClick,
  isSelected,
}: {
  skill: SkillTreeNode;
  index: number;
  onClick: () => void;
  isSelected: boolean;
}) {
  const progressPercent =
    skill.progress.maxLevel > 0
      ? (skill.progress.level / skill.progress.maxLevel) * 100
      : 0;

  const isComplete = skill.progress.level >= skill.progress.maxLevel;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={`
        relative w-full text-left p-3 rounded-xl border transition-all
        ${!skill.isUnlocked ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-200" : ""}
        ${isSelected ? "border-purple-400 bg-purple-50 shadow-md" : "border-gray-200 bg-white hover:border-purple-300 hover:shadow-sm"}
        ${isComplete ? "border-green-300 bg-green-50" : ""}
      `}
      disabled={!skill.isUnlocked}
    >
      <div className="flex items-center gap-3">
        {/* Status Icon */}
        <div className="flex-shrink-0">
          {!skill.isUnlocked ? (
            <Lock className="w-5 h-5 text-gray-400" />
          ) : isComplete ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-purple-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm text-gray-900 truncate">
              {skill.name}
            </span>
            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
              Lv.{skill.progress.level}/{skill.progress.maxLevel}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5">
            <motion.div
              className={`h-1.5 rounded-full ${isComplete ? "bg-green-500" : "bg-purple-500"}`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, delay: index * 0.05 + 0.2 }}
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
        </div>
      </div>
    </motion.button>
  );
}
