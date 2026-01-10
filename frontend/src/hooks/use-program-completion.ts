/**
 * Program Completion Hook
 *
 * Manages program completion data and feedback generation for the PBL complete page.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type {
  CompletionData,
  ScenarioData,
  QualitativeFeedback,
} from "@/types/pbl-completion";
import { authenticatedFetch } from "@/lib/utils/authenticated-fetch";

export interface UseProgramCompletionParams {
  programId: string;
  scenarioId: string;
}

export interface UseProgramCompletionReturn {
  loading: boolean;
  completionData: CompletionData | null;
  scenarioData: ScenarioData | null;
  scenarioTitle: string;
  feedback: QualitativeFeedback | undefined;
  generatingFeedback: boolean;
  allTasksEvaluated: boolean;
  formatDuration: (seconds: number) => string;
  generateFeedback: (forceRegenerate?: boolean) => Promise<void>;
}

export function useProgramCompletion({
  programId,
  scenarioId,
}: UseProgramCompletionParams): UseProgramCompletionReturn {
  const { t, i18n } = useTranslation(["pbl"]);

  const [loading, setLoading] = useState(true);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  const [generatingFeedback, setGeneratingFeedback] = useState(false);

  // Refs for preventing duplicate API calls
  const loadingRef = useRef(false);
  const feedbackGeneratingRef = useRef(false);
  const isMountedRef = useRef(false);

  // Check if all tasks are evaluated
  const allTasksEvaluated = completionData
    ? completionData.evaluatedTasks === completionData.totalTasks &&
      completionData.totalTasks > 0
    : false;

  // Extract current feedback from multi-language structure
  const currentLang = i18n.language;
  const feedbackObj = completionData?.qualitativeFeedback as
    | Record<string, { content?: QualitativeFeedback; isValid?: boolean }>
    | QualitativeFeedback
    | undefined;

  let feedback: QualitativeFeedback | undefined;
  if (feedbackObj && "overallAssessment" in feedbackObj) {
    feedback = feedbackObj as QualitativeFeedback;
  } else if (feedbackObj && currentLang in feedbackObj) {
    const langData = (
      feedbackObj as Record<string, { content?: QualitativeFeedback }>
    )[currentLang];
    feedback = langData?.content;
  }

  // Calculate scenario title from data
  const scenarioTitle = (() => {
    if (!scenarioData) return "Scenario";

    const title = scenarioData.title;

    if (typeof title === "object" && title !== null && !Array.isArray(title)) {
      const titleObj = title as Record<string, string>;
      return (
        titleObj[i18n.language] ||
        titleObj["zhTW"] ||
        titleObj["zh-TW"] ||
        titleObj["zh_TW"] ||
        titleObj["en"] ||
        Object.values(titleObj)[0] ||
        "Scenario"
      );
    }

    if (i18n.language === "zhTW" || i18n.language === "zh-TW") {
      return scenarioData.title_zhTW || scenarioData.title || "Scenario";
    }
    return scenarioData.title || "Scenario";
  })();

  const formatDuration = useCallback(
    (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;

      if (hours > 0) {
        return t("pbl:complete.timeFormat.hours", { hours, minutes });
      } else if (minutes > 0) {
        return t("pbl:complete.timeFormat.minutes", {
          minutes,
          seconds: remainingSeconds,
        });
      }
      return t("pbl:complete.timeFormat.seconds", { seconds: remainingSeconds });
    },
    [t]
  );

  const generateFeedback = useCallback(
    async (forceRegenerate = false) => {
      if (feedbackGeneratingRef.current) return;
      feedbackGeneratingRef.current = true;

      try {
        setGeneratingFeedback(true);

        const response = await authenticatedFetch("/api/pbl/generate-feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept-Language": i18n.language,
          },
          body: JSON.stringify({
            programId,
            scenarioId,
            forceRegenerate,
            language: currentLang,
          }),
        });

        const result = await response.json();

        if (result.success && result.feedback) {
          setCompletionData((prev) => {
            if (!prev) return null;

            const feedbackWrapper = {
              content: result.feedback,
              isValid: true,
              generatedAt: new Date().toISOString(),
            };

            const isMultiLang =
              typeof prev.qualitativeFeedback === "object" &&
              !("overallAssessment" in (prev.qualitativeFeedback as QualitativeFeedback));

            if (isMultiLang) {
              return {
                ...prev,
                qualitativeFeedback: {
                  ...(prev.qualitativeFeedback as unknown as Record<
                    string,
                    unknown
                  >),
                  [currentLang]: feedbackWrapper,
                } as unknown as CompletionData["qualitativeFeedback"],
              };
            } else {
              return {
                ...prev,
                qualitativeFeedback: {
                  [currentLang]: feedbackWrapper,
                } as unknown as CompletionData["qualitativeFeedback"],
              };
            }
          });
        } else {
          throw new Error(result.error || "Failed to generate feedback");
        }
      } catch (error) {
        console.error("Error generating feedback:", error);
      } finally {
        setGeneratingFeedback(false);
        feedbackGeneratingRef.current = false;
      }
    },
    [programId, scenarioId, currentLang, i18n.language]
  );

  const loadProgramData = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      setLoading(true);

      const [scenarioRes, completionRes] = await Promise.all([
        fetch(`/api/pbl/scenarios/${scenarioId}?lang=${currentLang}`),
        fetch(
          `/api/pbl/completion?programId=${programId}&scenarioId=${scenarioId}`
        ),
      ]);

      if (scenarioRes.ok) {
        const scenarioResult = await scenarioRes.json();
        setScenarioData(scenarioResult.data);
      }

      if (!completionRes.ok) {
        const updateRes = await authenticatedFetch(`/api/pbl/completion`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ programId, scenarioId }),
        });

        if (updateRes.ok) {
          const retryResponse = await authenticatedFetch(
            `/api/pbl/completion?programId=${programId}&scenarioId=${scenarioId}`
          );
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            if (data.success && data.data) {
              setCompletionData(data.data);

              const feedbackObj = data.data.qualitativeFeedback;
              const hasFeedback =
                feedbackObj?.overallAssessment ||
                feedbackObj?.[currentLang]?.content?.overallAssessment;

              if (!hasFeedback && !feedbackGeneratingRef.current) {
                generateFeedback();
              }
            }
          }
        }
      } else {
        const data = await completionRes.json();
        if (data.success && data.data) {
          setCompletionData(data.data);

          const feedbackObj = data.data.qualitativeFeedback;
          const hasFeedback =
            feedbackObj?.overallAssessment ||
            feedbackObj?.[currentLang]?.content?.overallAssessment;

          if (!hasFeedback && !feedbackGeneratingRef.current) {
            generateFeedback();
          }
        }
      }
    } catch (error) {
      console.error("Error loading program data:", error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [programId, scenarioId, currentLang, generateFeedback]);

  // Initial load
  useEffect(() => {
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    loadProgramData();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadProgramData]);

  // Watch for language changes and reload scenario data
  useEffect(() => {
    if (!completionData) return;

    const reloadScenarioForLanguage = async () => {
      try {
        const scenarioRes = await fetch(
          `/api/pbl/scenarios/${scenarioId}?lang=${currentLang}`
        );
        if (scenarioRes.ok) {
          const scenarioResult = await scenarioRes.json();
          setScenarioData(scenarioResult.data);
        }
      } catch (error) {
        console.error("Error reloading scenario for language:", error);
      }
    };

    reloadScenarioForLanguage();

    // Check if feedback exists for current language
    const hasFeedbackForCurrentLang =
      (feedback && "overallAssessment" in feedback) ||
      (feedbackObj &&
        currentLang in feedbackObj &&
        (feedbackObj as Record<string, { content?: QualitativeFeedback }>)[
          currentLang
        ]?.content?.overallAssessment);

    if (
      !hasFeedbackForCurrentLang &&
      !feedbackGeneratingRef.current &&
      !generatingFeedback
    ) {
      generateFeedback();
    }
  }, [
    i18n.language,
    completionData,
    currentLang,
    feedback,
    feedbackObj,
    generatingFeedback,
    generateFeedback,
    scenarioId,
  ]);

  return {
    loading,
    completionData,
    scenarioData,
    scenarioTitle,
    feedback,
    generatingFeedback,
    allTasksEvaluated,
    formatDuration,
    generateFeedback,
  };
}
