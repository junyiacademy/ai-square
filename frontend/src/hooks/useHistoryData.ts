import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { authenticatedFetch } from "@/lib/utils/authenticated-fetch";

export interface AssessmentHistoryItem {
  assessment_id: string;
  timestamp: string;
  scores: {
    overall: number;
    domains: {
      engaging_with_ai: number;
      creating_with_ai: number;
      managing_with_ai: number;
      designing_with_ai: number;
    };
  };
  summary: {
    total_questions: number;
    correct_answers: number;
    level: string;
  };
  duration_seconds: number;
  language: string;
}

export interface PBLSession {
  id: string;
  logId: string;
  scenarioId: string;
  scenarioTitle: string;
  currentTaskId?: string;
  currentTaskTitle?: string;
  status: "completed" | "in_progress" | "paused";
  startedAt: string;
  completedAt?: string;
  duration: number;
  progress: {
    percentage: number;
    completedTasks: number;
    totalTaskCount: number;
  };
  score?: number;
  totalInteractions?: number;
  averageScore?: number;
  domainScores?: {
    engaging_with_ai: number;
    creating_with_ai: number;
    managing_with_ai: number;
    designing_with_ai: number;
  };
  ksaScores?: {
    knowledge: number;
    skills: number;
    attitudes: number;
  };
}

export interface DiscoverySession {
  id: string;
  programId: string;
  scenarioId: string;
  scenarioTitle: string;
  careerType: string;
  currentTaskId?: string;
  currentTaskTitle?: string;
  status: "completed" | "active" | "inactive";
  startedAt: string;
  completedAt?: string;
  duration: number;
  progress: {
    percentage: number;
    completedTasks: number;
    totalTaskCount: number;
  };
  totalInteractions?: number;
  averageScore?: number;
  domainScores?: {
    engaging_with_ai: number;
    creating_with_ai: number;
    managing_with_ai: number;
    designing_with_ai: number;
  };
  ksaScores?: {
    knowledge: number;
    skills: number;
    attitudes: number;
  };
}

export type HistoryItem = {
  type: "assessment" | "pbl" | "discovery";
  timestamp: string;
  data: AssessmentHistoryItem | PBLSession | DiscoverySession;
};

export function useHistoryData() {
  const { i18n } = useTranslation();
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email?: string;
  } | null>(null);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const userData = localStorage.getItem("user");

    if (isLoggedIn === "true" && userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser({ id: String(user.id), email: user.email });
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  useEffect(() => {
    const fetchAllHistory = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const assessmentResponse = await authenticatedFetch(
          `/api/assessment/results?userId=${currentUser.id}&userEmail=${encodeURIComponent(currentUser.email || currentUser.id)}`,
        );
        const assessmentData = await assessmentResponse.json();
        const assessmentItems: HistoryItem[] = (
          assessmentData.data ||
          assessmentData.results ||
          []
        ).map((item: AssessmentHistoryItem) => ({
          type: "assessment" as const,
          timestamp: item.timestamp,
          data: item,
        }));

        let pblItems: HistoryItem[] = [];
        try {
          const pblResponse = await authenticatedFetch(
            `/api/pbl/history?lang=${i18n.language}&t=${Date.now()}`,
          );
          if (pblResponse.ok) {
            const pblData = await pblResponse.json();
            if (pblData.success && pblData.programs) {
              pblItems = pblData.programs.map(
                (program: Record<string, unknown>) => {
                  const currentTask = (
                    program.tasks as Array<{ id?: string; title?: string }>
                  )?.[(program.currentTaskIndex as number) || 0];
                  return {
                    type: "pbl" as const,
                    timestamp:
                      (program.completedAt as string) ||
                      (program.startedAt as string) ||
                      (program.program as { startedAt: string })?.startedAt,
                    data: {
                      id:
                        (program.programId as string) || (program.id as string),
                      logId:
                        (program.programId as string) || (program.id as string),
                      scenarioId: program.scenarioId as string,
                      scenarioTitle:
                        (program.scenarioTitle as string) || "PBL Scenario",
                      currentTaskId: currentTask?.id,
                      currentTaskTitle: currentTask?.title,
                      status: program.status as
                        | "completed"
                        | "in_progress"
                        | "paused",
                      startedAt:
                        (program.startedAt as string) ||
                        (program.program as { startedAt: string })?.startedAt,
                      completedAt: program.completedAt as string,
                      duration: (program.totalTimeSeconds as number) || 0,
                      progress: {
                        percentage: Math.round(
                          (((program.evaluatedTasks as number) || 0) /
                            ((program.totalTaskCount as number) || 1)) *
                            100,
                        ),
                        completedTasks: (program.evaluatedTasks as number) || 0,
                        totalTaskCount: (program.totalTaskCount as number) || 0,
                      },
                      totalInteractions:
                        (
                          program.tasks as Array<{
                            log?: { interactions?: unknown[] };
                          }>
                        )?.reduce(
                          (sum, task) =>
                            sum + (task.log?.interactions?.length || 0),
                          0,
                        ) || 0,
                      averageScore: program.overallScore as number,
                      domainScores:
                        program.domainScores as PBLSession["domainScores"],
                      ksaScores: program.ksaScores as PBLSession["ksaScores"],
                    },
                  };
                },
              );
            }
          }
        } catch (error) {
          console.error("Error fetching PBL history:", error);
        }

        const discoveryItems: HistoryItem[] = [];
        try {
          const discoveryResponse = await authenticatedFetch(
            `/api/discovery/my-programs?t=${Date.now()}`,
          );
          if (discoveryResponse.ok) {
            const discoveryScenarios = await discoveryResponse.json();
            if (
              Array.isArray(discoveryScenarios) &&
              discoveryScenarios.length > 0
            ) {
              for (const scenario of discoveryScenarios) {
                const programsResponse = await authenticatedFetch(
                  `/api/discovery/scenarios/${scenario.id}/programs?t=${Date.now()}`,
                );
                if (programsResponse.ok) {
                  const programs = await programsResponse.json();
                  const scenarioItems = programs.map(
                    (program: Record<string, unknown>) => {
                      const isCompleted = program.status === "completed";
                      const taskLogs = program.taskLogs || [];
                      const completedTasks =
                        (taskLogs as Record<string, unknown>[])?.filter(
                          (log: Record<string, unknown>) => log.isCompleted,
                        ).length || 0;
                      const totalTasks =
                        (program.totalTaskCount as number) ||
                        (taskLogs as unknown[])?.length ||
                        0;
                      const currentTaskIndex =
                        (program.currentTaskIndex as number) || 0;
                      const currentTaskId =
                        (program.metadata as Record<string, unknown>)
                          ?.currentTaskId || "";
                      const currentTask = {
                        id: currentTaskId,
                        title: "Current Task",
                      };

                      let duration = 0;
                      if (
                        isCompleted &&
                        program.completedAt &&
                        program.startedAt
                      ) {
                        const endTime = new Date(program.completedAt as string);
                        const startTime = new Date(program.startedAt as string);
                        duration = Math.floor(
                          (endTime.getTime() - startTime.getTime()) / 1000,
                        );
                      }

                      return {
                        type: "discovery" as const,
                        timestamp:
                          (program.completedAt as string) ||
                          (program.startedAt as string) ||
                          new Date().toISOString(),
                        data: {
                          id: scenario.id,
                          programId: program.id as string,
                          scenarioId: scenario.id,
                          scenarioTitle:
                            (scenario.title as string) || "Discovery Path",
                          careerType:
                            (scenario.metadata as { careerType?: string })
                              ?.careerType || "unknown",
                          currentTaskId: currentTask.id as string,
                          currentTaskTitle: currentTask.title,
                          status: program.status as
                            | "completed"
                            | "active"
                            | "inactive",
                          startedAt:
                            (program.startedAt as string) ||
                            new Date().toISOString(),
                          completedAt: program.completedAt as string,
                          duration: duration,
                          progress: {
                            percentage:
                              totalTasks > 0
                                ? Math.round(
                                    (completedTasks / totalTasks) * 100,
                                  )
                                : 0,
                            completedTasks: completedTasks,
                            totalTaskCount: totalTasks,
                          },
                        },
                      };
                    },
                  );
                  discoveryItems.push(...scenarioItems);
                }
              }
            }
          }
        } catch (error) {
          console.error("Error fetching discovery history:", error);
        }

        const allItems = [
          ...assessmentItems,
          ...pblItems,
          ...discoveryItems,
        ].sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );

        setHistoryItems(allItems);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllHistory();
  }, [currentUser, i18n.language]);

  return { historyItems, loading, currentUser };
}
