import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import type { IScenario, ITaskTemplate, ITask } from '@/types/unified-learning';
import type { DifficultyLevel, TaskType } from '@/types/database';
// import { cacheInvalidationService } from '@/lib/cache/cache-invalidation-service';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';

interface PBLTaskYAML {
  id: string;
  title?: string;
  type?: string;
  instructions?: string;
  content?: unknown;
  question?: {
    text?: string;
    type?: string;
    options?: unknown[];
    correct_answer?: unknown;
  };
  [key: string]: unknown;
}

interface PBLScenarioYAML {
  scenario_info?: {
    id: string;
    title?: string;
    description?: string;
    difficulty?: string;
    estimated_duration?: number;
    target_domains?: string[];
    prerequisites?: string[];
    learning_objectives?: string[];
  };
  challenge_statement?: string;
  real_world_context?: string;
  ksa_mapping?: Record<string, unknown>;
  tasks?: PBLTaskYAML[];
  ai_modules?: unknown[];
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const { force = false, clean = false } = await request.json().catch(() => ({})) as { force?: boolean; clean?: boolean };

    // Get repository
    const scenarioRepo = repositoryFactory.getScenarioRepository();

    // If clean flag is set, delete ALL PBL scenarios first (including archived)
    if (clean) {
      const allPblScenarios = await scenarioRepo.findByMode?.('pbl', true) || [];
      console.log(`[Init PBL] Cleaning ${allPblScenarios.length} scenarios`);
      for (const scenario of allPblScenarios) {
        try {
          await scenarioRepo.delete(scenario.id);
        } catch (error) {
          console.error(`[Init PBL] Failed to delete scenario ${scenario.id}:`, error);
          // Continue with other deletions
        }
      }
    }

    // Scan PBL YAML files recursively
    const pblDataPath = path.join(process.cwd(), 'public', 'pbl_data', 'scenarios');

    // Find all scenario directories
    const scenarioDirs = await fs.readdir(pblDataPath);

    const results = {
      scanned: 0,
      existing: 0,
      created: 0,
      updated: 0,
      errors: [] as string[]
    };

    // Group files by scenario (remove language suffix)
    const scenarioGroups: Map<string, Map<string, string>> = new Map();

    for (const dir of scenarioDirs) {
      if (dir.startsWith('_') || dir.includes('template')) continue;

      const dirPath = path.join(pblDataPath, dir);
      const stat = await fs.stat(dirPath);

      if (!stat.isDirectory()) continue;

      // Read all YAML files in this directory
      const files = await fs.readdir(dirPath);
      const yamlFiles = files.filter(f => (f.endsWith('.yaml') || f.endsWith('.yml')) && !f.includes('template'));

      if (yamlFiles.length === 0) continue;

      results.scanned++;

      // Group files by scenario ID
      const languageFiles = new Map<string, string>();

      for (const file of yamlFiles) {
        // Extract language code from filename (e.g., ai_education_design_en.yaml -> en)
        const match = file.match(/_([a-zA-Z]{2,5})\.ya?ml$/);
        const lang = match ? match[1] : 'en';
        languageFiles.set(lang, path.join(dirPath, file));
      }

      scenarioGroups.set(dir, languageFiles);
    }

    // Process each scenario group
    for (const [scenarioDir, languageFiles] of scenarioGroups) {
      try {
        // Start with English or first available language
        const primaryLang = languageFiles.has('en') ? 'en' : Array.from(languageFiles.keys())[0];
        const primaryFile = languageFiles.get(primaryLang)!;

        const primaryContent = await fs.readFile(primaryFile, 'utf-8');
        const primaryData = yaml.load(primaryContent) as PBLScenarioYAML;

        if (!primaryData?.scenario_info?.id) {
          results.errors.push(`No scenario_info.id in ${scenarioDir}`);
          continue;
        }

        const scenarioId = primaryData.scenario_info.id;

        // Check if scenario already exists
        const existingScenarios = await scenarioRepo.findByMode?.('pbl') || [];
        const existing = existingScenarios.find(s =>
          s.sourceId === scenarioId
        );

        if (existing && !force) {
          results.existing++;
          continue;
        }

        // Build multilingual content
        const title: Record<string, string> = {};
        const description: Record<string, string> = {};
        const objectives: Record<string, string[]> = {};
        const challengeStatement: Record<string, string> = {};
        const realWorldContext: Record<string, string> = {};

        // Store tasks by ID with multilingual content
        const tasksByIdAndLang: Map<string, Map<string, PBLTaskYAML>> = new Map();

        // Process each language file
        for (const [lang, filePath] of languageFiles) {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const data = yaml.load(content) as PBLScenarioYAML;

            if (data?.scenario_info?.title) {
              title[lang] = data.scenario_info.title;
            }
            if (data?.scenario_info?.description) {
              description[lang] = data.scenario_info.description;
            }
            if (data?.scenario_info?.learning_objectives && Array.isArray(data.scenario_info.learning_objectives)) {
              objectives[lang] = data.scenario_info.learning_objectives;
            }
            if (data?.challenge_statement) {
              challengeStatement[lang] = data.challenge_statement as string;
            }
            if (data?.real_world_context) {
              realWorldContext[lang] = data.real_world_context as string;
            }

            // Process tasks for this language
            if (Array.isArray(data?.tasks)) {
              for (const task of data.tasks) {
                if (!task.id) continue;

                if (!tasksByIdAndLang.has(task.id)) {
                  tasksByIdAndLang.set(task.id, new Map());
                }

                tasksByIdAndLang.get(task.id)!.set(lang, task);
              }
            }
          } catch (error) {
            console.error(`Error reading ${lang} file for ${scenarioDir}:`, error);
          }
        }

        // Ensure at least English version exists
        if (!title.en && Object.keys(title).length > 0) {
          title.en = Object.values(title)[0];
        }
        if (!description.en && Object.keys(description).length > 0) {
          description.en = Object.values(description)[0];
        }
        if (!objectives.en && Object.keys(objectives).length > 0) {
          objectives.en = Object.values(objectives)[0];
        }

        // Build multilingual task templates
        const taskTemplates: ITaskTemplate[] = [];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const [_taskId, langVersions] of tasksByIdAndLang) {
          // Get English version as base, or first available
          const baseTask = langVersions.get('en') || langVersions.get(primaryLang) || Array.from(langVersions.values())[0];

          // Build multilingual fields
          const multilingualTask: ITaskTemplate = {
            id: baseTask.id,
            type: (baseTask.type as TaskType) || 'chat',
            category: baseTask.category,
            time_limit: baseTask.time_limit,
            KSA_focus: baseTask.KSA_focus,
            ai_module: baseTask.ai_module,
            ai_feedback: baseTask.ai_feedback,
            title: {},
            description: {},
            instructions: {},
            content: {}
          };

          // Build question if exists (from base task, not as reference)
          if (baseTask.question) {
            multilingualTask.question = {
              type: baseTask.question.type,
              options: baseTask.question.options,
              correct_answer: baseTask.question.correct_answer,
              text: {} // Will be filled with multilingual content
            };
          }

          // Merge all language versions
          for (const [lang, task] of langVersions) {
            if (task.title) {
              multilingualTask.title[lang] = task.title as string;
            }
            if (task.description) {
              multilingualTask.description = multilingualTask.description || {};
              multilingualTask.description[lang] = task.description as string;
            }
            if (task.instructions) {
              (multilingualTask as Record<string, unknown>).instructions = (multilingualTask as Record<string, unknown>).instructions || {};
              ((multilingualTask as Record<string, unknown>).instructions as Record<string, string>)[lang] = task.instructions as string;
            }
            if (task.content) {
              (multilingualTask.content as Record<string, unknown>)[lang] = task.content;
            }

            // Handle question text if exists
            if (task.question?.text && (multilingualTask as Record<string, unknown>).question) {
              const question = (multilingualTask as Record<string, unknown>).question as Record<string, unknown>;
              question.text = {
                ...question.text as Record<string, string> || {},
                [lang]: task.question.text
              };
            }
          }

          // Ensure at least English versions exist
          if (!multilingualTask.title.en && Object.keys(multilingualTask.title).length > 0) {
            multilingualTask.title.en = Object.values(multilingualTask.title)[0];
          }
          const instructionsObj = (multilingualTask as Record<string, unknown>).instructions as Record<string, string> || {};
          if (!instructionsObj.en && Object.keys(instructionsObj).length > 0) {
            instructionsObj.en = Object.values(instructionsObj)[0];
          }

          taskTemplates.push(multilingualTask);
        }

        const scenarioData: Omit<IScenario, 'id'> = {
          mode: 'pbl',
          status: 'active',
          version: '1.0.0',
          sourceType: 'yaml',
          sourcePath: `pbl_data/scenarios/${scenarioDir}`,
          sourceId: scenarioId,
          sourceMetadata: {
            scenarioDir,
            scenarioId,
            languageFiles: Array.from(languageFiles.keys())
          },
          title,
          description,
          objectives,
          difficulty: (primaryData.scenario_info.difficulty as DifficultyLevel) || 'beginner',
          estimatedMinutes: primaryData.scenario_info.estimated_duration || 60,
          prerequisites: Array.isArray(primaryData.scenario_info.prerequisites)
            ? primaryData.scenario_info.prerequisites
            : [],
          taskTemplates,
          xpRewards: { completion: 100 },
          unlockRequirements: {},
          discoveryData: {},
          assessmentData: {},
          aiModules: {},
          resources: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pblData: {
            challengeStatement,
            realWorldContext,
            targetDomains: Array.isArray(primaryData.scenario_info.target_domains)
              ? primaryData.scenario_info.target_domains
              : [],
            ksaMapping: primaryData.ksa_mapping || {},
            aiModules: Array.isArray(primaryData.ai_modules)
              ? primaryData.ai_modules
              : []
          },
          metadata: {
            originalYamlId: scenarioId,
            importedAt: new Date().toISOString(),
            importedBy: 'init-api',
            languagesAvailable: Array.from(languageFiles.keys())
          }
        };

        let scenario: IScenario;
        if (existing && force) {
          // Update existing
          scenario = await scenarioRepo.update(existing.id, scenarioData);
          results.updated++;
        } else {
          // Create new
          scenario = await scenarioRepo.create(scenarioData);
          results.created++;
        }

        // Note: Tasks will be created when user starts a Program, not during initialization
        // The taskTemplates are stored in the Scenario and will be used to create Tasks later

      } catch (error) {
        console.error(`Error processing scenario ${scenarioDir}:`, error);
        results.errors.push(`Failed to process ${scenarioDir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Clear all PBL-related caches after successful initialization
    if (results.created > 0 || results.updated > 0) {
      console.log('[Init PBL] Clearing PBL caches...');
      try {
        // Clear PBL scenario caches
        await distributedCacheService.delete('scenarios:by-mode:pbl');
        await distributedCacheService.delete('pbl:scenarios:*');

        // Clear all scenario-related caches using pattern
        const keys = await distributedCacheService.getAllKeys();
        const pblKeys = keys.filter(key =>
          key.includes('pbl') ||
          key.includes('scenario') ||
          key.startsWith('scenarios:')
        );

        for (const key of pblKeys) {
          await distributedCacheService.delete(key);
        }

        console.log(`[Init PBL] Cleared ${pblKeys.length} cache entries`);
      } catch (error) {
        console.error('[Init PBL] Error clearing caches:', error);
        // Don't fail the request if cache clearing fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `PBL initialization completed`,
      results,
      summary: `Created: ${results.created}, Updated: ${results.updated}, Existing: ${results.existing}, Errors: ${results.errors.length}`
    });

  } catch (error) {
    console.error('PBL init error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize PBL scenarios'
    }, { status: 500 });
  }
}

// GET endpoint to check current status
export async function GET() {
  try {
    const scenarioRepo = repositoryFactory.getScenarioRepository();

    const scenarios = await scenarioRepo.findByMode?.('pbl') || [];

    return NextResponse.json({
      success: true,
      count: scenarios.length,
      scenarios: scenarios.map(s => ({
        id: s.id,
        sourceId: s.sourceId,
        title: s.title,
        sourcePath: s.sourcePath,
        status: s.status,
        languages: (s.metadata as Record<string, unknown>)?.languagesAvailable as string[] || []
      }))
    });
  } catch (error) {
    console.error('PBL status check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check PBL status'
    }, { status: 500 });
  }
}
