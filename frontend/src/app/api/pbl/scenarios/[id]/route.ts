import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import yaml from "js-yaml";
import { cachedGET, parallel, memoize } from "@/lib/api/optimization-utils";
import { normalizeLanguageCode } from "@/lib/utils/language";
// Removed unused import
import type { Scenario } from "@/lib/repositories/interfaces";

// Type definitions for KSA mapping
interface KSAItem {
  code: string;
  name: string;
  description: string;
}

interface KSAMapping {
  knowledge: KSAItem[];
  skills: KSAItem[];
  attitudes: KSAItem[];
}

// Type definitions for KSA data structure
interface KSACode {
  summary: string;
  summary_zhTW?: string;
  summary_es?: string;
  summary_ja?: string;
  summary_ko?: string;
  summary_fr?: string;
  summary_de?: string;
  summary_ru?: string;
  summary_it?: string;
}

interface KSATheme {
  codes: Record<string, KSACode>;
}

interface KSASection {
  themes: Record<string, KSATheme>;
}

interface KSAData {
  knowledge_codes?: KSASection;
  skill_codes?: KSASection;
  attitude_codes?: KSASection;
}

interface YAMLData {
  ksa_mapping?: {
    knowledge?: string[];
    skills?: string[];
    attitudes?: string[];
  };
  [key: string]: unknown;
}

// Simplified type definitions for API response
interface ScenarioResponse {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedDuration: number;
  targetDomains: string[];
  prerequisites: string[];
  learningObjectives: string[];
  ksaMapping?: KSAMapping;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    instructions: string[];
    expectedOutcome: string;
    timeLimit?: number;
  }>;
}

// Memoized helper functions for better performance
const getLocalizedValue = memoize(((...args: unknown[]) => {
  const [data, fieldName, lang] = args as [
    Record<string, unknown>,
    string,
    string,
  ];
  const langSuffix = lang;
  const localizedField = `${fieldName}_${langSuffix}`;
  return data[localizedField] || data[fieldName] || "";
}) as (...args: unknown[]) => unknown);

// TODO: CRITICAL PERFORMANCE ISSUE - Move KSA data to PostgreSQL
// This file I/O operation is causing high Cloud Run costs:
// - 280KB of YAML files loaded on every cold start
// - CPU-intensive YAML parsing
// - KSA is STATIC content that never changes - why reload?
// Solution: Either load once at startup OR migrate to PostgreSQL

// Cache KSA data in memory (never expires - static content)
const loadKSACodes = memoize(
  (async (...args: unknown[]) => {
    const [lang = "en"] = args as [string?];
    try {
      // Use CDN if available, fallback to filesystem
      const KSA_CDN_URL =
        process.env.KSA_CDN_URL ||
        "https://storage.googleapis.com/ai-square-static/ksa";

      // Normalize language code (e.g., zh -> zhCN)
      const normalizedLang = normalizeLanguageCode(lang);
      // Convert to file naming format (e.g., zh-TW -> zhTW)
      const fileLanguage = normalizedLang.replace(/[-_]/g, "");

      // Try CDN first (in production)
      if (KSA_CDN_URL && process.env.NODE_ENV === "production") {
        console.log(`📦 Loading KSA from CDN for lang: ${lang}`);
        const response = await fetch(
          `${KSA_CDN_URL}/ksa_codes_${fileLanguage}.json`,
        );
        if (response.ok) {
          return (await response.json()) as KSAData;
        }
        console.warn(`Failed to load from CDN, falling back to filesystem`);
      }

      // Fallback to filesystem (for local dev)
      console.warn(
        `⚠️ Loading KSA from filesystem for lang: ${lang} - Using fallback`,
      );
      const ksaPath = path.join(
        process.cwd(),
        "public",
        "rubrics_data",
        "ksa_codes",
        `ksa_codes_${fileLanguage}.yaml`,
      );
      const ksaContent = await fs.readFile(ksaPath, "utf8");
      return yaml.load(ksaContent) as KSAData;
    } catch (error) {
      console.error("Error loading KSA codes:", error);
      // Fallback to English if specific language not found
      if (lang !== "en") {
        const loadKSACodesInner = loadKSACodes as (
          lang?: string,
        ) => Promise<KSAData | null>;
        return loadKSACodesInner("en");
      }
      return null;
    }
  }) as (...args: unknown[]) => unknown,
  Infinity,
) as (lang?: string) => Promise<KSAData | null>; // Never expire - KSA is static content!

// Optimized KSA lookup with indexing
const ksaIndexCache = new Map<string, Map<string, KSAItem>>();

function buildKSAIndex(ksaData: KSAData, lang: string): Map<string, KSAItem> {
  const cacheKey = `ksa-index-${lang}`;
  if (ksaIndexCache.has(cacheKey)) {
    return ksaIndexCache.get(cacheKey)!;
  }

  const index = new Map<string, KSAItem>();

  // Index knowledge codes
  if (ksaData.knowledge_codes?.themes) {
    for (const theme of Object.values(ksaData.knowledge_codes.themes)) {
      if (theme.codes) {
        for (const [code, data] of Object.entries(theme.codes)) {
          index.set(code, {
            code,
            name: `Knowledge: ${code}`,
            description: getLocalizedValue(
              data as unknown as Record<string, unknown>,
              "summary",
              lang,
            ) as string,
          });
        }
      }
    }
  }

  // Index skill codes
  if (ksaData.skill_codes?.themes) {
    for (const theme of Object.values(ksaData.skill_codes.themes)) {
      if (theme.codes) {
        for (const [code, data] of Object.entries(theme.codes)) {
          index.set(code, {
            code,
            name: `Skill: ${code}`,
            description: getLocalizedValue(
              data as unknown as Record<string, unknown>,
              "summary",
              lang,
            ) as string,
          });
        }
      }
    }
  }

  // Index attitude codes
  if (ksaData.attitude_codes?.themes) {
    for (const theme of Object.values(ksaData.attitude_codes.themes)) {
      if (theme.codes) {
        for (const [code, data] of Object.entries(theme.codes)) {
          index.set(code, {
            code,
            name: `Attitude: ${code}`,
            description: getLocalizedValue(
              data as unknown as Record<string, unknown>,
              "summary",
              lang,
            ) as string,
          });
        }
      }
    }
  }

  ksaIndexCache.set(cacheKey, index);
  return index;
}

// Optimized KSA mapping builder
function buildKSAMapping(
  yamlData: YAMLData,
  ksaData: KSAData | null,
  lang: string,
): KSAMapping | undefined {
  if (!yamlData.ksa_mapping || !ksaData) return undefined;

  const index = buildKSAIndex(ksaData, lang);
  const mapping: KSAMapping = {
    knowledge: [],
    skills: [],
    attitudes: [],
  };

  // Process all codes at once
  if (yamlData.ksa_mapping.knowledge) {
    mapping.knowledge = yamlData.ksa_mapping.knowledge
      .map((code) => index.get(code))
      .filter(Boolean) as KSAItem[];
  }

  if (yamlData.ksa_mapping.skills) {
    mapping.skills = yamlData.ksa_mapping.skills
      .map((code) => index.get(code))
      .filter(Boolean) as KSAItem[];
  }

  if (yamlData.ksa_mapping.attitudes) {
    mapping.attitudes = yamlData.ksa_mapping.attitudes
      .map((code) => index.get(code))
      .filter(Boolean) as KSAItem[];
  }

  return mapping;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: scenarioId } = await params;

  // Check if it's a UUID or a YAML ID
  const isUUID = scenarioId.match(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );

  // Use cached GET wrapper with 5 minute TTL
  return cachedGET(
    request,
    async () => {
      const { searchParams } = new URL(request.url);
      const lang = searchParams.get("lang") || "en";

      console.log(
        "Loading scenario:",
        scenarioId,
        "with lang:",
        lang,
        "isUUID:",
        isUUID,
      );

      // Load scenario and KSA data in parallel
      const [scenarioResult, ksaData] = (await parallel(
        (async () => {
          const { repositoryFactory } =
            await import("@/lib/repositories/base/repository-factory");
          const scenarioRepo = repositoryFactory.getScenarioRepository();

          if (isUUID) {
            // Direct lookup by UUID
            return scenarioRepo.findById(scenarioId);
          } else {
            // Use index for fast lookup
            const { scenarioIndexService } =
              await import("@/lib/services/scenario-index-service");
            const { scenarioIndexBuilder } =
              await import("@/lib/services/scenario-index-builder");

            // Ensure index exists
            await scenarioIndexBuilder.ensureIndex();

            // Look up UUID by YAML ID
            const uuid = await scenarioIndexService.getUuidByYamlId(scenarioId);
            if (!uuid) {
              return null;
            }

            // Fetch scenario by UUID
            return scenarioRepo.findById(uuid);
          }
        })(),
        loadKSACodes(lang),
      )) as [Scenario | null, KSAData | null];

      if (!scenarioResult) {
        throw new Error("Scenario not found");
      }

      // Get YAML data from metadata or pblData
      const yamlData =
        scenarioResult.metadata?.yamlData || scenarioResult.pblData;

      console.log("Scenario loaded from unified architecture: success");
      console.log("Has yamlData:", !!yamlData);
      console.log("Has pblData:", !!scenarioResult.pblData);
      console.log("Has taskTemplates:", !!scenarioResult.taskTemplates);

      // Transform to API response format
      const scenarioResponse: ScenarioResponse = {
        id: scenarioResult.id,
        title:
          typeof scenarioResult.title === "string"
            ? scenarioResult.title
            : (scenarioResult.title as Record<string, string>)?.[lang] ||
              (scenarioResult.title as Record<string, string>)?.en ||
              "",
        description:
          typeof scenarioResult.description === "string"
            ? scenarioResult.description
            : (scenarioResult.description as Record<string, string>)?.[lang] ||
              (scenarioResult.description as Record<string, string>)?.en ||
              "",
        difficulty:
          scenarioResult.difficulty ||
          ((scenarioResult.metadata as Record<string, unknown>)
            ?.difficulty as string) ||
          "intermediate",
        estimatedDuration:
          scenarioResult.estimatedMinutes ||
          ((scenarioResult.metadata as Record<string, unknown>)
            ?.estimatedDuration as number) ||
          60,
        targetDomains:
          ((scenarioResult.pblData as Record<string, unknown>)
            ?.targetDomains as string[]) ||
          ((scenarioResult.metadata as Record<string, unknown>)
            ?.targetDomains as string[]) ||
          [],
        prerequisites: (() => {
          // Check for multilingual prerequisites in metadata
          const metadata = scenarioResult.metadata as Record<string, unknown>;
          if (metadata?.multilingualPrerequisites) {
            const multilingualPrereqs =
              metadata.multilingualPrerequisites as Record<string, string[]>;
            return multilingualPrereqs[lang] || multilingualPrereqs.en || [];
          }

          // Fallback to database prerequisites (English only for legacy data)
          const dbPrerequisites = scenarioResult.prerequisites;
          if (Array.isArray(dbPrerequisites) && dbPrerequisites.length > 0) {
            if (lang === "en") {
              return dbPrerequisites;
            }
          }

          return [];
        })(),
        learningObjectives: (() => {
          // First try database objectives with multilingual support
          const dbObjectives =
            scenarioResult.objectives ||
            (
              scenarioResult as {
                objectives?: string[] | Record<string, string[]>;
              }
            ).objectives;

          // If database has multilingual objectives, use them
          if (
            dbObjectives &&
            typeof dbObjectives === "object" &&
            !Array.isArray(dbObjectives)
          ) {
            const multilangObjectives = dbObjectives as Record<
              string,
              string[]
            >;
            return multilangObjectives[lang] || multilangObjectives.en || [];
          }

          // If database has simple array but user wants non-English, try YAML first
          if (
            lang !== "en" &&
            yamlData &&
            (yamlData as Record<string, unknown>).scenario_info
          ) {
            const scenarioInfo = (yamlData as Record<string, unknown>)
              .scenario_info as Record<string, unknown>;
            const yamlObjectives = scenarioInfo.learning_objectives;
            if (Array.isArray(yamlObjectives)) {
              const objectives = yamlObjectives
                .map((obj) => {
                  if (typeof obj === "string") return obj;
                  if (typeof obj === "object" && obj !== null) {
                    const multilangObj = obj as Record<string, unknown>;
                    return (
                      (multilangObj[lang] as string) ||
                      (multilangObj.en as string) ||
                      ""
                    );
                  }
                  return "";
                })
                .filter(Boolean);

              // If we found non-empty objectives in YAML, use them
              if (objectives.length > 0) {
                return objectives;
              }
            }
          }

          // Finally, use database array if available (fallback to English)
          if (
            dbObjectives &&
            Array.isArray(dbObjectives) &&
            dbObjectives.length > 0
          ) {
            return dbObjectives;
          }

          return [];
        })(),
        ksaMapping: yamlData
          ? buildKSAMapping(yamlData as unknown as YAMLData, ksaData, lang)
          : undefined,
        tasks: await (async () => {
          // Use taskTemplates from Scenario for display (not Task DB which only has tasks after program starts)
          try {
            // Skip Task DB lookup - Tasks only exist after program starts
            // Use taskTemplates from scenario instead
            console.log("📋 Loading task templates from scenario");

            // Jump directly to fallback logic
            throw new Error("Skip to taskTemplates");
          } catch (error) {
            console.error("❌ Error reading tasks from DB:", error);

            // 🔄 Fallback to taskTemplates if Task DB fails
            console.log("🔄 Falling back to taskTemplates from scenario");
            return (scenarioResult.taskTemplates || []).map(
              (task: Record<string, unknown>) => ({
                id: String(task.id || ""),
                title:
                  typeof task.title === "object"
                    ? (task.title as Record<string, string>)?.[lang] ||
                      (task.title as Record<string, string>)?.en ||
                      ""
                    : String(task.title || ""),
                description:
                  typeof task.description === "object"
                    ? (task.description as Record<string, string>)?.[lang] ||
                      (task.description as Record<string, string>)?.en ||
                      ""
                    : String(task.description || task.instructions || ""),
                category: String(task.category || task.type || "general"),
                instructions: (() => {
                  const inst = task.instructions;
                  if (!inst) return [];
                  if (Array.isArray(inst)) {
                    return inst
                      .map((item) => {
                        if (typeof item === "string") return item;
                        if (typeof item === "object" && item !== null) {
                          const obj = item as Record<string, unknown>;
                          if (obj[lang] && typeof obj[lang] === "string")
                            return String(obj[lang]);
                          if (obj.en && typeof obj.en === "string")
                            return String(obj.en);
                          if (obj.text && typeof obj.text === "string")
                            return String(obj.text);
                          if (obj.content && typeof obj.content === "string")
                            return String(obj.content);
                        }
                        return "";
                      })
                      .filter((s) => s !== "");
                  }
                  if (typeof inst === "string") return [inst];
                  if (typeof inst === "object" && inst !== null) {
                    const obj = inst as Record<string, unknown>;
                    if (obj[lang] && typeof obj[lang] === "string")
                      return [String(obj[lang])];
                    if (obj.en && typeof obj.en === "string")
                      return [String(obj.en)];
                  }
                  return [];
                })(),
                expectedOutcome: String(task.expectedOutcome || ""),
                timeLimit: Number(task.estimatedTime || task.timeLimit || 30),
              }),
            );
          }
        })(),
      };

      return {
        success: true,
        data: scenarioResponse,
      };
    },
    {
      ttl: 300, // 5 minutes
      staleWhileRevalidate: 3600, // 1 hour
    },
  );
}
