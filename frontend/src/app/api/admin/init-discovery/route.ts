import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import type { IScenario } from "@/types/unified-learning";
import type { DifficultyLevel } from "@/types/database";
import { distributedCacheService } from "@/lib/cache/distributed-cache-service";

interface DiscoveryScenarioYAML {
  path_id: string;
  category?: string;
  difficulty_range?: string;
  metadata?: {
    title?: string;
    short_description?: string;
    long_description?: string;
    estimated_hours?: number;
    skill_focus?: string[];
  };
  career_path?: {
    stages?: unknown[];
    milestones?: unknown[];
  };
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    // Optional: Add auth check for admin only
    // const session = await getSession();
    // if (!session?.user?.role === 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { force = false, clean = false } = (await request
      .json()
      .catch(() => ({}))) as { force?: boolean; clean?: boolean };

    // Get repository
    const scenarioRepo = repositoryFactory.getScenarioRepository();

    // If clean flag is set, delete ALL discovery scenarios first (including archived)
    if (clean) {
      const allDiscoveryScenarios =
        (await scenarioRepo.findByMode?.("discovery", true)) || [];
      console.log(
        `[Init Discovery] Cleaning ${allDiscoveryScenarios.length} scenarios`,
      );
      for (const scenario of allDiscoveryScenarios) {
        try {
          await scenarioRepo.delete(scenario.id);
        } catch (error) {
          console.error(
            `[Init Discovery] Failed to delete scenario ${scenario.id}:`,
            error,
          );
          // Continue with other deletions
        }
      }
    }

    // Scan Discovery YAML files in subdirectories
    const discoveryDataPath = path.join(
      process.cwd(),
      "public",
      "discovery_data",
    );
    let dirs: string[] = [];

    try {
      dirs = await fs.readdir(discoveryDataPath);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Discovery data directory not found",
          path: discoveryDataPath,
        },
        { status: 404 },
      );
    }

    const results = {
      scanned: 0,
      existing: 0,
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    // Group files by career path (similar to PBL approach)
    const careerGroups: Map<string, Map<string, string>> = new Map();

    for (const dir of dirs) {
      if (dir.startsWith(".") || dir.includes("template")) continue;

      const dirPath = path.join(discoveryDataPath, dir);
      const stat = await fs.stat(dirPath);

      if (!stat.isDirectory()) continue;

      // Read all YAML files in this directory
      const files = await fs.readdir(dirPath);
      const yamlFiles = files.filter(
        (f) =>
          (f.endsWith(".yaml") || f.endsWith(".yml")) &&
          !f.includes("template"),
      );

      if (yamlFiles.length === 0) continue;

      results.scanned++;

      // Group files by language
      const languageFiles = new Map<string, string>();

      for (const file of yamlFiles) {
        // Extract language code from filename (e.g., app_developer_en.yml -> en)
        const match = file.match(/_([a-zA-Z]{2,5})\.ya?ml$/);
        const lang = match ? match[1] : "en";
        languageFiles.set(lang, path.join(dirPath, file));
      }

      careerGroups.set(dir, languageFiles);
    }

    // Process each career group
    for (const [careerDir, languageFiles] of careerGroups) {
      try {
        // Start with English or first available language
        const primaryLang = languageFiles.has("en")
          ? "en"
          : Array.from(languageFiles.keys())[0];
        const primaryFile = languageFiles.get(primaryLang)!;

        const primaryContent = await fs.readFile(primaryFile, "utf-8");
        const primaryData = yaml.load(primaryContent) as DiscoveryScenarioYAML;

        if (!primaryData?.path_id) {
          results.errors.push(`No path_id in ${careerDir}`);
          continue;
        }

        const pathId = primaryData.path_id;

        // Check if scenario already exists
        const existingScenarios =
          (await scenarioRepo.findByMode?.("discovery")) || [];
        const existing = existingScenarios.find((s) => s.sourceId === pathId);

        if (existing && !force) {
          results.existing++;
          continue;
        }

        // Build multilingual content
        const title: Record<string, string> = {};
        const description: Record<string, string> = {};

        // Process each language file
        for (const [lang, filePath] of languageFiles) {
          try {
            const content = await fs.readFile(filePath, "utf-8");
            const data = yaml.load(content) as DiscoveryScenarioYAML;

            if (data?.metadata?.title) {
              title[lang] = data.metadata.title;
            }
            if (data?.metadata?.short_description) {
              description[lang] = data.metadata.short_description;
            }
          } catch (error) {
            console.error(
              `Error reading ${lang} file for ${careerDir}:`,
              error,
            );
          }
        }

        // Ensure at least English version exists
        if (!title.en && Object.keys(title).length > 0) {
          title.en = Object.values(title)[0];
        }
        if (!description.en && Object.keys(description).length > 0) {
          description.en = Object.values(description)[0];
        }
        if (!title.en) {
          title.en = pathId
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());
        }
        if (!description.en) {
          description.en = `Career exploration path: ${title.en}`;
        }

        const scenarioData: Omit<IScenario, "id"> = {
          mode: "discovery",
          status: "active",
          version: "1.0.0",
          sourceType: "yaml",
          sourcePath: `discovery_data/${careerDir}`,
          sourceId: pathId,
          sourceMetadata: {
            careerDir,
            pathId,
            languageFiles: Array.from(languageFiles.keys()),
          },
          title,
          description,
          objectives: Array.isArray(
            (primaryData.metadata as Record<string, unknown>)?.skill_focus,
          )
            ? ((primaryData.metadata as Record<string, unknown>)
                ?.skill_focus as string[])
            : [],
          difficulty: "beginner" as DifficultyLevel,
          estimatedMinutes:
            ((primaryData.metadata as Record<string, unknown>)
              ?.estimated_hours as number) * 60 || 120,
          prerequisites: [], // No prerequisites for discovery scenarios
          taskTemplates: [], // Discovery paths don't have task templates like PBL
          xpRewards: { completion: 75 },
          unlockRequirements: {},
          pblData: {},
          assessmentData: {},
          aiModules: {},
          resources: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          discoveryData: {
            pathId: pathId,
            category: primaryData.category,
            difficultyRange: primaryData.difficulty_range,
            estimatedHours:
              ((primaryData.metadata as Record<string, unknown>)
                ?.estimated_hours as number) || 2,
            skillFocus: Array.isArray(
              (primaryData.metadata as Record<string, unknown>)?.skill_focus,
            )
              ? ((primaryData.metadata as Record<string, unknown>)
                  ?.skill_focus as string[])
              : [],
            stages: Array.isArray(
              (primaryData.career_path as Record<string, unknown>)?.stages,
            )
              ? ((primaryData.career_path as Record<string, unknown>)
                  ?.stages as unknown[])
              : [],
            milestones: Array.isArray(
              (primaryData.career_path as Record<string, unknown>)?.milestones,
            )
              ? ((primaryData.career_path as Record<string, unknown>)
                  ?.milestones as unknown[])
              : [],
          },
          metadata: {
            originalPathId: pathId,
            importedAt: new Date().toISOString(),
            importedBy: "init-api",
            languagesAvailable: Array.from(languageFiles.keys()),
          },
        };

        if (existing && force) {
          // Update existing
          await scenarioRepo.update(existing.id, scenarioData);
          results.updated++;
        } else {
          // Create new
          await scenarioRepo.create(scenarioData);
          results.created++;
        }
      } catch (error) {
        console.error(`Error processing career ${careerDir}:`, error);
        results.errors.push(
          `Failed to process ${careerDir}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Clear discovery-related caches after successful initialization
    if (results.created > 0 || results.updated > 0) {
      console.log("[Init Discovery] Clearing discovery caches...");
      try {
        await distributedCacheService.delete("scenarios:by-mode:discovery");
        await distributedCacheService.delete("discovery:scenarios:*");

        // Clear all discovery-related cache keys
        const keys = await distributedCacheService.getAllKeys();
        const discoveryKeys = keys.filter(
          (key) =>
            key.includes("discovery") ||
            key.includes("scenario") ||
            key.startsWith("scenarios:"),
        );

        for (const key of discoveryKeys) {
          await distributedCacheService.delete(key);
        }

        console.log(
          `[Init Discovery] Cleared ${discoveryKeys.length} cache entries`,
        );
      } catch (error) {
        console.error("[Init Discovery] Error clearing caches:", error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Discovery initialization completed`,
      results,
      summary: `Created: ${results.created}, Updated: ${results.updated}, Existing: ${results.existing}, Errors: ${results.errors.length}`,
    });
  } catch (error) {
    console.error("Discovery init error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize Discovery scenarios",
      },
      { status: 500 },
    );
  }
}

// GET endpoint to check current status
export async function GET() {
  try {
    const scenarioRepo = repositoryFactory.getScenarioRepository();

    const scenarios = (await scenarioRepo.findByMode?.("discovery")) || [];

    return NextResponse.json({
      success: true,
      count: scenarios.length,
      scenarios: scenarios.map((s) => ({
        id: s.id,
        title: s.title,
        sourcePath: s.sourcePath,
        status: s.status,
      })),
    });
  } catch (error) {
    console.error("Discovery status check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check Discovery status",
      },
      { status: 500 },
    );
  }
}
