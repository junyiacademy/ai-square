/**
 * Discovery Scenario Detail API
 * GET /api/discovery/scenarios/[id] - 獲取單一 Discovery 場景詳細資訊
 */

import { NextRequest, NextResponse } from "next/server";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import { DiscoveryYAMLLoader } from "@/lib/services/discovery-yaml-loader";
import { getCareerInsights } from "@/lib/data/career-insights-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Get language from query params
    const { searchParams } = new URL(request.url);
    const language = searchParams.get("lang") || "en";

    const { id: scenarioId } = await params;

    // Get repository
    const scenarioRepo = repositoryFactory.getScenarioRepository();

    // Check if scenario exists — try findById first, fallback to slug (sourceId)
    let scenario = await scenarioRepo.findById(scenarioId).catch((err) => {
      // Only swallow invalid UUID errors, rethrow others
      if (
        err?.message?.includes("invalid input syntax for type uuid") ||
        err?.code === "22P02"
      ) {
        return null;
      }
      throw err;
    });
    if (!scenario) {
      // Slug lookup: find by sourceId (e.g., "cybersecurity_specialist")
      const results = await scenarioRepo.findBySource(
        "discovery",
        scenarioId,
      );
      scenario = results[0] || null;
    }

    if (!scenario || scenario.mode !== "discovery") {
      return NextResponse.json(
        {
          success: false,
          error: "Scenario not found",
          meta: {
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 },
      );
    }

    // Load YAML data for richer content
    const yamlLoader = new DiscoveryYAMLLoader();
    const discoveryDataObj = scenario.discoveryData as Record<string, unknown>;
    const careerType =
      (discoveryDataObj?.pathId as string) ||
      scenario.sourceId ||
      "unknown";
    const yamlData = await yamlLoader.loadPath(careerType, language);

    // Process multilingual fields
    const titleObj = scenario.title as Record<string, string>;
    const descObj = scenario.description as Record<string, string>;

    const processedScenario = {
      ...scenario,
      title: titleObj?.[language] || titleObj?.en || "Untitled",
      description: descObj?.[language] || descObj?.en || "No description",
      // Preserve original multilingual objects
      titleObj,
      descObj,
      // Process discoveryData multilingual fields
      discoveryData: scenario.discoveryData
        ? {
            ...scenario.discoveryData,
            dayInLife: (() => {
              const dayInLife = (
                scenario.discoveryData as Record<string, unknown>
              ).dayInLife as Record<string, string> | undefined;
              return dayInLife?.[language] || dayInLife?.en || "";
            })(),
            challenges: (() => {
              const challenges = (
                scenario.discoveryData as Record<string, unknown>
              ).challenges as Record<string, unknown[]> | undefined;
              return challenges?.[language] || challenges?.en || [];
            })(),
            rewards: (() => {
              const rewards = (
                scenario.discoveryData as Record<string, unknown>
              ).rewards as Record<string, unknown[]> | undefined;
              return rewards?.[language] || rewards?.en || [];
            })(),
          }
        : {},
      // YAML-enriched data for world_setting, skill_tree, starting_scenario, career_insights
      yamlData: yamlData
        ? {
            worldSetting: yamlData.world_setting,
            skillTree: yamlData.skill_tree,
            startingScenario: yamlData.starting_scenario,
            metadata: yamlData.metadata,
            milestoneQuests: yamlData.milestone_quests,
            achievements: yamlData.achievements,
            careerInsights: getCareerInsights(careerType),
          }
        : null,
    };

    // Return scenario data
    return NextResponse.json({
      success: true,
      data: {
        scenario: processedScenario,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        language: language,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/discovery/scenarios/[id]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}
