"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Sparkles,
  CheckCircle,
  Clock,
  Trophy,
  BarChart,
  Rocket,
  Cpu,
  Paintbrush,
  Video,
  Code,
  Box,
  Briefcase,
  Users,
  ArrowLeft,
  Play,
  Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import DiscoveryPageLayout from "@/components/discovery/DiscoveryPageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { normalizeLanguageCode } from "@/lib/utils/language";
interface Task {
  id: string;
  title: string;
  description: string;
  xp: number;
  status: "locked" | "available" | "completed" | "active";
  completedAt?: string;
  actualXP?: number; // Actual XP earned (from evaluation)
  attempts?: number; // Total attempts
  passCount?: number; // Number of successful attempts
}

interface ProgramData {
  id: string;
  scenarioId: string;
  status: "active" | "completed" | "paused";
  completedTasks: number;
  totalTasks: number;
  totalXP: number;
  tasks: Task[];
  createdAt: string;
  lastActiveAt: string;
  careerType?: string;
  scenarioTitle?: string;
}

export default function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string; programId: string }>;
}) {
  const router = useRouter();
  const { t, i18n } = useTranslation("discovery");
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [programData, setProgramData] = useState<ProgramData | null>(null);
  const [scenarioId, setScenarioId] = useState<string>("");
  const [programId, setProgramId] = useState<string>("");

  // Unwrap the params Promise
  useEffect(() => {
    params.then((p) => {
      setScenarioId(p.id);
      setProgramId(p.programId);
    });
  }, [params]);

  useEffect(() => {
    // Don't proceed until params are loaded
    if (!scenarioId || !programId || authLoading) {
      return;
    }

    if (!isLoggedIn) {
      router.push("/login?redirect=/discovery/scenarios");
      return;
    }

    const loadProgramData = async () => {
      try {
        setLoading(true);
        const sessionToken = localStorage.getItem("ai_square_session");
        const lang = normalizeLanguageCode(i18n.language);
        const response = await fetch(
          `/api/discovery/scenarios/${scenarioId}/programs/${programId}?t=${Date.now()}&lang=${lang}`,
          {
            credentials: "include",
            headers: {
              "x-session-token": sessionToken || "",
              "Cache-Control": "no-cache",
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to load program data");
        }

        const data = await response.json();
        setProgramData(data);
      } catch (error) {
        console.error("Error loading program data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (scenarioId && programId) {
      loadProgramData();
    }
  }, [scenarioId, programId, isLoggedIn, authLoading, router, i18n.language]);

  const handleStartTask = (taskId: string) => {
    // Navigate to task learning page
    router.push(
      `/discovery/scenarios/${scenarioId}/programs/${programId}/tasks/${taskId}`,
    );
  };

  if (authLoading || loading) {
    return (
      <DiscoveryPageLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
            <span>{t("scenarioDetail.loading")}</span>
          </div>
        </div>
      </DiscoveryPageLayout>
    );
  }

  if (!programData) {
    return (
      <DiscoveryPageLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500">{t("program.notFound")}</p>
          <button
            onClick={() => router.push(`/discovery/scenarios/${scenarioId}`)}
            className="mt-4 text-purple-600 hover:text-purple-700"
          >
            {t("program.backToScenario")}
          </button>
        </div>
      </DiscoveryPageLayout>
    );
  }

  const progress =
    programData.totalTasks > 0
      ? Math.round((programData.completedTasks / programData.totalTasks) * 100)
      : 0;

  // Career info mapping
  const careerInfo: Record<
    string,
    {
      title: string;
      icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
      color: string;
      skills: string[];
    }
  > = {
    content_creator: {
      title: t("careers.content_creator.title"),
      icon: Paintbrush,
      color: "from-purple-500 to-pink-500",
      skills: t("careers.content_creator.skills", { returnObjects: true }) as string[],
    },
    youtuber: {
      title: t("careers.youtuber.title"),
      icon: Video,
      color: "from-red-500 to-orange-500",
      skills: t("careers.youtuber.skills", { returnObjects: true }) as string[],
    },
    app_developer: {
      title: t("careers.app_developer.title"),
      icon: Code,
      color: "from-blue-500 to-cyan-500",
      skills: t("careers.app_developer.skills", { returnObjects: true }) as string[],
    },
    game_designer: {
      title: t("careers.game_designer.title"),
      icon: Box,
      color: "from-indigo-500 to-purple-500",
      skills: t("careers.game_designer.skills", { returnObjects: true }) as string[],
    },
    tech_entrepreneur: {
      title: t("careers.tech_entrepreneur.title"),
      icon: Rocket,
      color: "from-yellow-500 to-red-500",
      skills: t("careers.tech_entrepreneur.skills", { returnObjects: true }) as string[],
    },
    startup_founder: {
      title: t("careers.startup_founder.title"),
      icon: Briefcase,
      color: "from-green-500 to-teal-500",
      skills: t("careers.startup_founder.skills", { returnObjects: true }) as string[],
    },
    data_analyst: {
      title: t("careers.data_analyst.title"),
      icon: BarChart,
      color: "from-teal-500 to-blue-500",
      skills: t("careers.data_analyst.skills", { returnObjects: true }) as string[],
    },
    ux_designer: {
      title: t("careers.ux_designer.title"),
      icon: Sparkles,
      color: "from-pink-500 to-purple-500",
      skills: t("careers.ux_designer.skills", { returnObjects: true }) as string[],
    },
    product_manager: {
      title: t("careers.product_manager.title"),
      icon: Users,
      color: "from-orange-500 to-yellow-500",
      skills: t("careers.product_manager.skills", { returnObjects: true }) as string[],
    },
    ai_developer: {
      title: t("careers.ai_developer.title"),
      icon: Cpu,
      color: "from-violet-500 to-purple-500",
      skills: t("careers.ai_developer.skills", { returnObjects: true }) as string[],
    },
  };

  const currentCareer = careerInfo[programData.careerType || "unknown"] || {
    title: programData.scenarioTitle || "Discovery Scenario",
    icon: Sparkles,
    color: "from-gray-500 to-gray-600",
    skills: [],
  };
  const CareerIcon = currentCareer.icon;

  return (
    <DiscoveryPageLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/discovery/scenarios/${scenarioId}`)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t("program.backToScenario")}</span>
        </button>

        {/* Career Info Card with Banner */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
          <div className="flex items-center gap-4 p-4">
            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${currentCareer.color} relative overflow-hidden flex-shrink-0`}>
              <Image
                src={`/images/discovery-banners/${programData.careerType || "general"}.webp`}
                alt={currentCareer.title}
                fill
                className="object-cover"
                sizes="64px"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {currentCareer.title}
            </h2>
          </div>
        </div>

        {/* Program Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t("programCard.title")}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {t("programCard.startedOn")}{" "}
                    {new Date(programData.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Trophy className="w-4 h-4" />
                  <span>{programData.totalXP} XP</span>
                </div>
              </div>
            </div>

            {programData.status === "active" && (
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                {t("programCard.statusActive")}
              </span>
            )}
            {programData.status === "completed" && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                {t("programCard.statusCompleted")}
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">{t("programCard.progress")}</span>
              <span className="text-gray-900 font-medium">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {t("programCard.tasksCompleted", { completed: programData.completedTasks, total: programData.totalTasks })}
            </p>
          </div>
        </div>

        {/* Tasks List */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("program.tasks")}</h2>

          <div className="space-y-4">
            {programData.tasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  bg-white rounded-xl shadow-md border transition-all
                  ${
                    task.status === "available" || task.status === "active"
                      ? "border-purple-200 hover:shadow-lg cursor-pointer"
                      : task.status === "completed"
                        ? "border-green-100 hover:shadow-lg cursor-pointer"
                        : "border-gray-100"
                  }
                  ${task.status === "completed" ? "bg-gray-50" : ""}
                `}
                onClick={() =>
                  (task.status === "available" ||
                    task.status === "active" ||
                    task.status === "completed") &&
                  handleStartTask(task.id)
                }
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      {/* Task Icon */}
                      <div
                        className={`
                        p-3 rounded-full
                        ${
                          task.status === "completed"
                            ? "bg-green-100"
                            : (task as Task).status === "available" ||
                                (task as Task).status === "active"
                              ? "bg-purple-100"
                              : "bg-gray-100"
                        }
                      `}
                      >
                        {task.status === "completed" && (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        )}
                        {((task as Task).status === "available" ||
                          (task as Task).status === "active") && (
                          <Sparkles className="w-6 h-6 text-purple-600" />
                        )}
                        {(task as Task).status === "locked" && (
                          <Lock className="w-6 h-6 text-gray-400" />
                        )}
                      </div>

                      {/* Task Content */}
                      <div className="flex-1">
                        <h3
                          className={`
                          text-lg font-semibold mb-1
                          ${task.status === "completed" ? "text-gray-600" : "text-gray-900"}
                        `}
                        >
                          {t("program.taskLabel", { n: index + 1 })}:{" "}
                          {typeof task.title === "object" && task.title !== null
                            ? (task.title as Record<string, string>)[
                                normalizeLanguageCode(i18n.language)
                              ] ||
                              (task.title as Record<string, string>)["en"] ||
                              "Untitled Task"
                            : (task.title as string)}
                        </h3>
                        <p
                          className={`
                          text-sm mb-2
                          ${task.status === "completed" ? "text-gray-500" : "text-gray-600"}
                        `}
                        >
                          {typeof task.description === "object" &&
                          task.description !== null
                            ? (task.description as Record<string, string>)[
                                normalizeLanguageCode(i18n.language)
                              ] ||
                              (task.description as Record<string, string>)[
                                "en"
                              ] ||
                              ""
                            : (task.description as string)}
                        </p>

                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            <span className="text-gray-600">
                              {task.status === "completed" && task.actualXP
                                ? `${task.actualXP} XP (獲得)`
                                : `${task.xp} XP`}
                            </span>
                          </div>

                          {task.status === "completed" && task.attempts && (
                            <>
                              <div className="flex items-center space-x-1">
                                <span className="text-gray-600">📊</span>
                                <span className="text-gray-600">
                                  {t("program.attempts", { count: task.attempts })}
                                </span>
                              </div>
                              {task.passCount && task.passCount > 0 && (
                                <div className="flex items-center space-x-1">
                                  <span className="text-gray-600">⭐</span>
                                  <span className="text-gray-600">
                                    {t("program.passes", { count: task.passCount })}
                                  </span>
                                </div>
                              )}
                            </>
                          )}

                          {task.completedAt && (
                            <span className="text-green-600">
                              {t("program.completedOn")}{" "}
                              {new Date(task.completedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    {((task as Task).status === "available" ||
                      (task as Task).status === "active") && (
                      <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                        <Play className="w-4 h-4" />
                        <span>{t("program.start")}</span>
                      </button>
                    )}
                    {task.status === "completed" && (
                      <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                        <CheckCircle className="w-4 h-4" />
                        <span>{t("program.view")}</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Generate more tasks if all completed */}
        {programData.completedTasks === programData.totalTasks &&
          programData.totalTasks > 0 && (
            <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-8 text-center">
              <Trophy className="w-16 h-16 text-purple-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {t("program.allCompleted")}
              </h3>
              <p className="text-gray-600 mb-6">
                {t("program.allCompletedDesc", { xp: programData.totalXP })}
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() =>
                    router.push(
                      `/discovery/scenarios/${scenarioId}/programs/${programId}/complete`,
                    )
                  }
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>{t("program.viewFullResults")}</span>
                </button>
                <button
                  onClick={() =>
                    router.push(`/discovery/scenarios/${scenarioId}`)
                  }
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>{t("program.startNew")}</span>
                </button>
              </div>
            </div>
          )}
      </div>
    </DiscoveryPageLayout>
  );
}
