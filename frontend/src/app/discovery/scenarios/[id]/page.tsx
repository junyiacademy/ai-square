"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Sparkles,
  Rocket,
  Clock,
  Trophy,
  ChevronRight,
  GraduationCap,
  BarChart,
  Cpu,
  Paintbrush,
  Video,
  Code,
  Box,
  Briefcase,
  Users,
  ArrowLeft,
  Plus,
  Play,
  Lock,
  Star,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import DiscoveryPageLayout from "@/components/discovery/DiscoveryPageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { normalizeLanguageCode } from "@/lib/utils/language";
import { authenticatedFetch } from "@/lib/utils/authenticated-fetch";
import { useGamificationProfile } from "@/hooks/useGamificationProfile";

// Icon mapping for career types
const careerIcons: Record<
  string,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  content_creator: Paintbrush,
  youtuber: Video,
  app_developer: Code,
  game_designer: Box,
  tech_entrepreneur: Rocket,
  startup_founder: Briefcase,
  data_analyst: BarChart,
  ux_designer: Sparkles,
  ai_engineer: Cpu,
  ai_developer: Cpu,
  digital_marketer: Sparkles,
  social_media_manager: Users,
  product_manager: Users,
  biotech_researcher: Sparkles,
  cybersecurity_specialist: Code,
  environmental_scientist: BarChart,
};

// Color mapping for career types
const careerColors: Record<string, string> = {
  content_creator: "from-purple-500 to-pink-500",
  youtuber: "from-red-500 to-orange-500",
  app_developer: "from-blue-500 to-cyan-500",
  game_designer: "from-indigo-500 to-purple-500",
  tech_entrepreneur: "from-yellow-500 to-red-500",
  startup_founder: "from-green-500 to-teal-500",
  data_analyst: "from-teal-500 to-blue-500",
  ux_designer: "from-pink-500 to-purple-500",
  ai_engineer: "from-violet-500 to-purple-500",
  ai_developer: "from-violet-500 to-purple-500",
  digital_marketer: "from-orange-500 to-red-500",
  social_media_manager: "from-blue-500 to-indigo-500",
  product_manager: "from-orange-500 to-yellow-500",
  biotech_researcher: "from-green-500 to-emerald-500",
  cybersecurity_specialist: "from-gray-600 to-gray-800",
  environmental_scientist: "from-green-600 to-teal-600",
};

interface ScenarioData {
  id: string;
  title: string;
  description: string;
  mode: string;
  difficulty: string;
  estimatedMinutes: number;
  sourceId?: string;
  discoveryData?: {
    pathId?: string;
    category?: string;
    careerInsights?: {
      job_market?: {
        demand?: string;
        growth_rate?: string;
        salary_range?: string;
        job_titles?: string[];
      };
      required_skills?: {
        technical?: string[];
        soft?: string[];
      };
      typical_day?: Record<string, string>;
    };
    worldSetting?: {
      name?: Record<string, string>;
      description?: Record<string, string>;
    };
    startingScenario?: {
      title?: Record<string, string>;
      description?: Record<string, string>;
    };
  };
  yamlData?: {
    worldSetting?: {
      name?: string;
      description?: string;
      atmosphere?: string;
      visual_theme?: string;
    };
    skillTree?: {
      core_skills?: Array<{
        id: string;
        name: string;
        description: string;
        max_level: number;
      }>;
      advanced_skills?: Array<{
        id: string;
        name: string;
        description: string;
        max_level: number;
      }>;
    };
    startingScenario?: {
      title?: string;
      description?: string;
      initial_tasks?: string[];
    };
    metadata?: {
      title?: string;
      short_description?: string;
      long_description?: string;
      estimated_hours?: number;
      skill_focus?: string[];
    };
    milestoneQuests?: Array<{
      id: string;
      name: string;
      description: string;
      required_level: number;
      skills_tested: string[];
      xp_reward: number;
      unlocks?: string[];
    }>;
    careerInsights?: {
      job_market?: {
        demand?: string;
        growth_rate?: string;
        salary_range?: string;
        job_titles?: string[];
      };
      required_skills?: {
        technical?: string[];
        soft?: string[];
      };
    } | null;
  } | null;
  metadata?: Record<string, unknown>;
  taskTemplates?: Array<Record<string, unknown>>;
  careerType?: string; // For backward compatibility
}

interface ProgramData {
  id: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  currentTaskIndex?: number;
  metadata?: {
    totalXP?: number;
    completedTasks?: number;
    totalTasks?: number;
  };
}

export default function DiscoveryScenarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { profile: gamificationProfile } = useGamificationProfile();

  const [loading, setLoading] = useState(true);
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  const [programs, setPrograms] = useState<ProgramData[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [creatingProgram, setCreatingProgram] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState<string>("");

  const loadPrograms = useCallback(async () => {
    try {
      setLoadingPrograms(true);
      const sessionToken = localStorage.getItem("ai_square_session");

      const response = await authenticatedFetch(
        `/api/discovery/scenarios/${scenarioId}/programs?lang=${i18n.language}`,
        {
          credentials: "include",
          headers: {
            "x-session-token": sessionToken || "",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setPrograms(data.programs || []);
      }
    } catch (error) {
      console.error("Error loading programs:", error);
    } finally {
      setLoadingPrograms(false);
    }
  }, [scenarioId, i18n.language]);

  // Unwrap the params Promise
  useEffect(() => {
    params.then((p) => {
      setScenarioId(p.id);
    });
  }, [params]);

  useEffect(() => {
    // Wait for params and auth check to complete
    if (!scenarioId || authLoading) {
      return;
    }

    if (!isLoggedIn) {
      router.push("/login?redirect=/discovery/scenarios");
      return;
    }

    const loadScenarioData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get session token from localStorage for API calls
        const sessionToken = localStorage.getItem("ai_square_session");

        const lang = normalizeLanguageCode(i18n.language);
        const response = await authenticatedFetch(
          `/api/discovery/scenarios/${scenarioId}?lang=${lang}`,
          {
            credentials: "include",
            headers: {
              "x-session-token": sessionToken || "",
            },
          },
        );

        if (response.status === 401) {
          // Session expired, redirect to login
          router.push("/login?redirect=/discovery/scenarios");
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load scenario data");
        }

        const data = await response.json();
        // API returns { success, data: { scenario } }
        if (data.success && data.data?.scenario) {
          setScenarioData(data.data.scenario);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (error) {
        console.error("Error loading scenario data:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load scenario data",
        );
      } finally {
        setLoading(false);
      }
    };

    if (scenarioId) {
      loadScenarioData();
      loadPrograms();
    }
  }, [
    scenarioId,
    isLoggedIn,
    authLoading,
    router,
    i18n.language,
    loadPrograms,
  ]);

  const createNewProgram = async () => {
    try {
      setCreatingProgram(true);
      const sessionToken = localStorage.getItem("ai_square_session");
      const lang = normalizeLanguageCode(i18n.language);

      const response = await authenticatedFetch(
        `/api/discovery/scenarios/${scenarioId}/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-token": sessionToken || "",
          },
          credentials: "include",
          body: JSON.stringify({ language: lang }),
        },
      );

      if (response.status === 401) {
        router.push("/login?redirect=/discovery/scenarios");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create program");
      }

      const program = await response.json();
      // Navigate to the new program page
      router.push(`/discovery/scenarios/${scenarioId}/programs/${program.id}`);
    } catch (error) {
      console.error("Error creating program:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create program",
      );
    } finally {
      setCreatingProgram(false);
    }
  };

  const handleSelectProgram = (programId: string) => {
    router.push(`/discovery/scenarios/${scenarioId}/programs/${programId}`);
  };

  if (authLoading || loading) {
    return (
      <DiscoveryPageLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
            <span>{t("discovery:scenarioDetail.loading")}</span>
          </div>
        </div>
      </DiscoveryPageLayout>
    );
  }

  if (!scenarioData) {
    return (
      <DiscoveryPageLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500">
            {t("discovery:scenarioDetail.notFound")}
          </p>
          <button
            onClick={() => router.push("/discovery/scenarios")}
            className="mt-4 text-purple-600 hover:text-purple-700"
          >
            {t("discovery:scenarioDetail.backToList")}
          </button>
        </div>
      </DiscoveryPageLayout>
    );
  }

  const careerType = (scenarioData.discoveryData?.pathId ||
    scenarioData.metadata?.yamlId ||
    scenarioData.careerType ||
    "app_developer") as string;
  const Icon = careerIcons[careerType as keyof typeof careerIcons] || Sparkles;
  const color =
    careerColors[careerType as keyof typeof careerColors] ||
    "from-gray-500 to-gray-600";
  const skills = (scenarioData.metadata?.skillFocus || []) as string[];
  const bannerImage = `/images/discovery-banners/${scenarioData.sourceId || careerType}.webp`;

  return (
    <DiscoveryPageLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push("/discovery/scenarios")}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t("discovery:scenarioDetail.backToList")}</span>
        </button>

        {/* Career Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className={`h-48 bg-gradient-to-br ${color} relative overflow-hidden`}>
            <Image
              src={bannerImage}
              alt={scenarioData.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
              onError={(e) => {
                // Fallback to gradient + icon if image not found
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            {/* Fallback icon (visible when image fails to load) */}
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="w-24 h-24 text-white/90" />
            </div>
          </div>

          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {scenarioData.title}
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              {scenarioData.description}
            </p>
            <p className="text-gray-700 mb-6">
              {(scenarioData.metadata?.longDescription as string) || ""}
            </p>

            {/* Skills */}
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Estimated hours from YAML */}
            {scenarioData.yamlData?.metadata?.estimated_hours && (
              <div className="flex items-center space-x-2 mt-4 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>
                  {t("discovery:scenarioDetail.estimatedHours", {
                    hours: scenarioData.yamlData.metadata.estimated_hours,
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* World Setting from YAML */}
        {scenarioData.yamlData?.worldSetting && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span>{scenarioData.yamlData.worldSetting.name || t("discovery:scenarioDetail.worldSetting")}</span>
            </h2>
            {scenarioData.yamlData.worldSetting.description && (
              <p className="text-gray-700 mb-3">{scenarioData.yamlData.worldSetting.description}</p>
            )}
            {scenarioData.yamlData.worldSetting.atmosphere && (
              <p className="text-sm text-gray-500 italic">{scenarioData.yamlData.worldSetting.atmosphere}</p>
            )}
          </div>
        )}

        {/* Starting Scenario from YAML */}
        {scenarioData.yamlData?.startingScenario && (
          <div className="bg-purple-50 rounded-2xl p-6 mb-6 border border-purple-100">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center space-x-2">
              <Rocket className="w-5 h-5 text-purple-600" />
              <span>{scenarioData.yamlData.startingScenario.title || t("discovery:scenarioDetail.firstMission")}</span>
            </h2>
            {scenarioData.yamlData.startingScenario.description && (
              <p className="text-gray-700 mb-4">{scenarioData.yamlData.startingScenario.description}</p>
            )}
            {scenarioData.yamlData.startingScenario.initial_tasks &&
              scenarioData.yamlData.startingScenario.initial_tasks.length > 0 && (
                <ul className="space-y-2">
                  {scenarioData.yamlData.startingScenario.initial_tasks.map((task, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-gray-700 text-sm">{task}</span>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        )}

        {/* Core Skills from YAML */}
        {scenarioData.yamlData?.skillTree?.core_skills &&
          scenarioData.yamlData.skillTree.core_skills.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-purple-600" />
                <span>{t("discovery:scenarioDetail.coreSkills")}</span>
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {scenarioData.yamlData.skillTree.core_skills.slice(0, 6).map((skill, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-700 text-xs font-bold">{idx + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{skill.name}</p>
                      <p className="text-gray-600 text-xs mt-0.5">{skill.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Milestone Quests from YAML */}
        {scenarioData.yamlData?.milestoneQuests &&
          scenarioData.yamlData.milestoneQuests.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-purple-600" />
                <span>{t("discovery:scenarioDetail.milestoneQuests", "里程碑任務")}</span>
              </h2>
              <div className="space-y-4">
                {scenarioData.yamlData.milestoneQuests.map((quest) => {
                  const userLevel = gamificationProfile.level;
                  const isCompleted = false; // No per-quest completion tracking yet
                  const isAvailable = userLevel >= quest.required_level;
                  const isLocked = !isAvailable;

                  return (
                    <div
                      key={quest.id}
                      className={`rounded-xl border-2 p-4 transition-colors ${
                        isLocked
                          ? "border-gray-200 bg-gray-50 opacity-60"
                          : isCompleted
                            ? "border-green-300 bg-green-50"
                            : "border-purple-200 bg-purple-50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                            isLocked
                              ? "bg-gray-200"
                              : isCompleted
                                ? "bg-green-200"
                                : "bg-purple-200"
                          }`}>
                            {isLocked ? (
                              <Lock className="w-5 h-5 text-gray-500" />
                            ) : isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <Star className="w-5 h-5 text-purple-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center flex-wrap gap-2 mb-1">
                              <h3 className={`font-semibold text-sm ${
                                isLocked ? "text-gray-500" : isCompleted ? "text-green-800" : "text-purple-900"
                              }`}>
                                {quest.name}
                              </h3>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                isLocked
                                  ? "bg-gray-200 text-gray-500"
                                  : isCompleted
                                    ? "bg-green-200 text-green-700"
                                    : "bg-purple-200 text-purple-700"
                              }`}>
                                {isCompleted
                                  ? t("discovery:scenarioDetail.questCompleted", "已完成")
                                  : isAvailable
                                    ? t("discovery:scenarioDetail.questAvailable", "可挑戰")
                                    : t("discovery:scenarioDetail.questLocked", "未解鎖")}
                              </span>
                            </div>
                            <p className={`text-xs mb-2 ${isLocked ? "text-gray-400" : "text-gray-600"}`}>
                              {quest.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center space-x-1">
                                <GraduationCap className="w-3.5 h-3.5" />
                                <span>
                                  {t("discovery:scenarioDetail.requiredLevel", "需要等級")} {quest.required_level}
                                </span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Star className="w-3.5 h-3.5 text-yellow-500" />
                                <span>{quest.xp_reward} XP</span>
                              </span>
                            </div>
                            {quest.skills_tested && quest.skills_tested.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {quest.skills_tested.map((skill) => (
                                  <span
                                    key={skill}
                                    className={`px-2 py-0.5 rounded-full text-xs ${
                                      isLocked
                                        ? "bg-gray-100 text-gray-400"
                                        : "bg-white text-purple-600 border border-purple-200"
                                    }`}
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Programs Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {t("discovery:scenarioDetail.myPrograms")}
            </h2>
            <button
              onClick={createNewProgram}
              disabled={creatingProgram}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              <span>
                {creatingProgram
                  ? t("discovery:scenarioDetail.creating")
                  : t("discovery:scenarioDetail.startNewProgram")}
              </span>
            </button>
          </div>

          {/* Programs List or Start Button */}
          {loadingPrograms ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-gray-600">{t("discovery:scenarioDetail.loadingPrograms")}</p>
            </div>
          ) : programs.length > 0 ? (
            <div className="grid gap-4 mt-6">
              {programs.map((program) => (
                <div
                  key={program.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/discovery/scenarios/${scenarioId}/programs/${program.id}`,
                    )
                  }
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {program.status === "completed" ? "✅ " : "🚀 "}
                          {t("discovery:scenarioDetail.learningJourney", { n: programs.indexOf(program) + 1 })}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            program.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {program.status === "completed"
                            ? t("discovery:programCard.statusCompleted")
                            : t("discovery:programCard.statusActive")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {t("discovery:scenarioDetail.startedOn")}{" "}
                        {new Date(program.createdAt).toLocaleDateString()}
                        {program.completedAt &&
                          ` • ${t("discovery:scenarioDetail.completedOn")} ${new Date(program.completedAt).toLocaleDateString()}`}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <span>💎 {program.metadata?.totalXP || 0} XP</span>
                        <span>
                          📊 {program.metadata?.completedTasks || 0}/
                          {program.metadata?.totalTasks || 6} {t("discovery:scenarioDetail.taskCount")}
                        </span>
                        {program.metadata?.completedTasks &&
                          program.metadata?.totalTasks && (
                            <span className="text-purple-600 font-medium">
                              (
                              {Math.round(
                                (program.metadata.completedTasks /
                                  program.metadata.totalTasks) *
                                  100,
                              )}
                              % {t("discovery:scenarioDetail.completed")})
                            </span>
                          )}
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.round(((program.metadata?.completedTasks || 0) / (program.metadata?.totalTasks || 6)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={createNewProgram}
                disabled={creatingProgram}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform transition-all disabled:opacity-50"
              >
                {creatingProgram ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>{t("discovery:scenarioDetail.creating")}</span>
                  </span>
                ) : (
                  t("discovery:scenarioDetail.startExploration")
                )}
              </motion.button>
              <p className="mt-4 text-gray-600">
                {t("discovery:scenarioDetail.readyToStart")}
              </p>
            </div>
          )}

          {/* Career Insights from YAML data */}
          {scenarioData.yamlData?.careerInsights && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <Briefcase className="w-6 h-6 text-purple-600" />
                <span>{t("discovery:scenarioDetail.careerInfo")}</span>
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Job Market */}
                {scenarioData.yamlData.careerInsights.job_market && (
                  <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <BarChart className="w-5 h-5 mr-2 text-purple-600" />
                      {t("discovery:scenarioDetail.jobMarket")}
                    </h3>
                    <div className="space-y-2 text-sm">
                      {scenarioData.yamlData.careerInsights.job_market.demand && (
                        <p>
                          <span className="font-medium">
                            {t("discovery:scenarioDetail.demand")}:
                          </span>{" "}
                          {scenarioData.yamlData.careerInsights.job_market.demand}
                        </p>
                      )}
                      {scenarioData.yamlData.careerInsights.job_market.growth_rate && (
                        <p>
                          <span className="font-medium">
                            {t("discovery:scenarioDetail.growth")}:
                          </span>{" "}
                          {scenarioData.yamlData.careerInsights.job_market.growth_rate}
                        </p>
                      )}
                      {scenarioData.yamlData.careerInsights.job_market.salary_range && (
                        <p>
                          <span className="font-medium">
                            {t("discovery:scenarioDetail.salary")}:
                          </span>{" "}
                          {scenarioData.yamlData.careerInsights.job_market.salary_range}
                        </p>
                      )}
                      {scenarioData.yamlData.careerInsights.job_market.job_titles &&
                        scenarioData.yamlData.careerInsights.job_market.job_titles.length > 0 && (
                          <div>
                            <p className="font-medium mb-1">
                              {t("discovery:scenarioDetail.jobTitles")}:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {scenarioData.yamlData.careerInsights.job_market.job_titles.map(
                                (title, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
                                  >
                                    {title}
                                  </span>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {/* Required Skills */}
                {scenarioData.yamlData.careerInsights.required_skills && (
                  <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <GraduationCap className="w-5 h-5 mr-2 text-purple-600" />
                      {t("discovery:scenarioDetail.requiredSkills")}
                    </h3>
                    <div className="space-y-3">
                      {scenarioData.yamlData.careerInsights.required_skills.technical && (
                        <div>
                          <p className="font-medium text-sm mb-1">
                            {t("discovery:scenarioDetail.technical")}:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {scenarioData.yamlData.careerInsights.required_skills.technical.map(
                              (skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                                >
                                  {skill}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                      {scenarioData.yamlData.careerInsights.required_skills.soft && (
                        <div>
                          <p className="font-medium text-sm mb-1">
                            {t("discovery:scenarioDetail.soft")}:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {scenarioData.yamlData.careerInsights.required_skills.soft.map(
                              (skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                                >
                                  {skill}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hidden programs section for future use */}
          {false && (
            <div className="grid gap-4">
              {[].map((program: ProgramData, index) => (
                <motion.div
                  key={program.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleSelectProgram(program.id)}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-100 hover:border-purple-200"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {t("discovery:programCard.title")} #{index + 1}
                          </h3>
                          {program.status === "active" && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              {t("discovery:programCard.statusActive")}
                            </span>
                          )}
                          {program.status === "completed" && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {t("discovery:programCard.statusCompleted")}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {t("discovery:programCard.startedOn")}{" "}
                              {new Date(program.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Trophy className="w-4 h-4" />
                            <span>
                              {(program.metadata?.totalXP as number) || 0} XP
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">
                              {t("discovery:programCard.progress")}
                            </span>
                            <span className="text-gray-900 font-medium">
                              {Math.round(
                                ((program.metadata?.completedTasks || 0) /
                                  (program.metadata?.totalTasks || 1)) *
                                  100,
                              )}
                              %
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.round(((program.metadata?.completedTasks || 0) / (program.metadata?.totalTasks || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {t("discovery:programCard.tasksCompleted", {
                              completed:
                                (program.metadata?.completedTasks as number) ||
                                0,
                              total:
                                (program.metadata?.totalTasks as number) || 0,
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="ml-4 flex items-center">
                        {program.status === "active" ? (
                          <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                            <Play className="w-4 h-4" />
                            <span>{t("discovery:programCard.continue")}</span>
                          </button>
                        ) : program.status === "completed" ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/discovery/scenarios/${scenarioId}/programs/${program.id}/complete`,
                              );
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Trophy className="w-4 h-4" />
                            <span>
                              {t("discovery:programCard.viewResults")}
                            </span>
                          </button>
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DiscoveryPageLayout>
  );
}
