/**
 * PBL Scenario Loader Service
 * Handles loading and processing PBL scenarios from database
 */

import type { IScenario } from "@/types/unified-learning";

export interface ProcessedScenario {
  id: string;
  yamlId: string;
  sourceType: string;
  title: string;
  description: string;
  difficulty?: string;
  estimatedDuration?: number;
  targetDomains?: string[];
  targetDomain?: string[];
  domains?: string[];
  taskCount: number;
  isAvailable: boolean;
  thumbnailEmoji: string;
}

/**
 * Service for loading and processing PBL scenarios
 */
export class PBLScenarioLoaderService {
  private readonly emojiMap: Record<string, string> = {
    "ai-job-search": "💼",
    "ai-education-design": "🎓",
    "ai-stablecoin-trading": "₿",
    "ai-robotics-development": "🤖",
    "high-school-climate-change": "🌍",
    "high-school-digital-wellness": "📱",
    "high-school-smart-city": "🏙️",
    "high-school-creative-arts": "🎨",
    "high-school-health-assistant": "💗",
  };

  /**
   * Get scenario emoji by ID
   */
  public getScenarioEmoji(scenarioId: string): string {
    return this.emojiMap[scenarioId] || "🤖";
  }

  /**
   * Extract localized string from multilingual field
   */
  private getLocalizedString(
    field: string | Record<string, string> | undefined,
    lang: string,
  ): string {
    if (typeof field === "string") {
      return field;
    }
    if (typeof field === "object" && field !== null) {
      return field[lang] || field.en || "";
    }
    return "";
  }

  /**
   * Load scenarios from database
   */
  async loadScenarios(lang: string): Promise<ProcessedScenario[]> {
    const scenarios: ProcessedScenario[] = [];

    try {
      // Get all PBL scenarios from database
      const { repositoryFactory } =
        await import("@/lib/repositories/base/repository-factory");
      const scenarioRepo = repositoryFactory.getScenarioRepository();
      const rawScenarios = (await scenarioRepo.findByMode?.("pbl")) || [];
      const existingScenarios = rawScenarios as IScenario[];

      console.log(
        `[PBL API] Repository returned ${rawScenarios.length} raw scenarios`,
      );
      console.log(
        `[PBL API] Found ${existingScenarios.length} PBL scenarios in database`,
      );
      if (existingScenarios.length > 0) {
        console.log("[PBL API] First scenario:", {
          id: existingScenarios[0].id,
          title: existingScenarios[0].title,
          status: existingScenarios[0].status,
          mode: existingScenarios[0].mode,
        });
      } else {
        console.log("[PBL API] No scenarios found, checking repository...");
        console.log(
          "[PBL API] Repository findByMode exists?",
          !!scenarioRepo.findByMode,
        );
      }

      // Build/update the index with PBL scenarios
      const { scenarioIndexService } =
        await import("@/lib/services/scenario-index-service");
      await scenarioIndexService.buildIndex(existingScenarios);

      // Process each scenario from database
      for (const scenario of existingScenarios) {
        try {
          // Extract title and description with proper language support
          const title = this.getLocalizedString(scenario.title, lang);
          const description = this.getLocalizedString(
            scenario.description,
            lang,
          );

          // Get yamlId from metadata or sourceId
          const yamlId =
            (scenario.metadata?.yamlId as string) ||
            scenario.sourceId ||
            scenario.id;

          // Extract targetDomains from metadata or pblData
          const targetDomains =
            (scenario.metadata?.targetDomains as string[] | undefined) ||
            ((scenario.pblData as Record<string, unknown>)?.targetDomains as
              | string[]
              | undefined);

          scenarios.push({
            id: scenario.id, // UUID
            yamlId: yamlId, // for compatibility
            sourceType: "pbl",
            title,
            description,
            difficulty:
              scenario.difficulty ||
              (scenario.metadata?.difficulty as string | undefined),
            estimatedDuration:
              scenario.estimatedMinutes ||
              (scenario.metadata?.estimatedDuration as number | undefined),
            targetDomains,
            targetDomain: targetDomains, // for compatibility
            domains: targetDomains, // for compatibility
            taskCount:
              scenario.taskTemplates?.length || scenario.taskCount || 0,
            isAvailable: true,
            thumbnailEmoji: this.getScenarioEmoji(yamlId),
          });
        } catch (error) {
          console.error(`Error processing scenario ${scenario.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Error loading scenarios from database:", error);
    }

    return scenarios;
  }
}
