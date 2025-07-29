import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import type { IScenario } from '@/types/unified-learning';
import { getServerSession } from '@/lib/auth/session';
import path from 'path';
import { promises as fs } from 'fs';
import { parse as yamlParse } from 'yaml';

interface AssessmentConfig {
  title?: string;
  description?: string;
  total_questions?: number;
  time_limit_minutes?: number;
  passing_score?: number;
  domains?: string[];
}

interface CachedScenario { // eslint-disable-line @typescript-eslint/no-unused-vars
  id: string;
  title: string;
  description: string;
  folderName: string;
  config: {
    totalQuestions: number;
    timeLimit: number;
    passingScore: number;
    domains: string[];
  };
}

// Removed unused cache variables

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';
    const session = await getServerSession();
    const user = session?.user;
    
    // Get scenario repository
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // First, try to get scenarios from database
    console.log('Loading assessment scenarios from database');
    const dbScenarios = await scenarioRepo.findByMode?.('assessment') || [];
    
    if (dbScenarios.length > 0) {
      console.log(`Found ${dbScenarios.length} assessment scenarios in database`);
      
      // Format scenarios from database
      const formattedScenarios = dbScenarios.map((scenario: IScenario) => ({
        id: scenario.id,
        title: scenario.title?.[lang] || scenario.title?.en || 'Untitled Assessment',
        description: scenario.description?.[lang] || scenario.description?.en || 'No description',
        folderName: scenario.sourceMetadata?.folderName || scenario.sourceId || scenario.id,
        config: {
          totalQuestions: (scenario.assessmentData as Record<string, unknown>)?.totalQuestions as number || 12,
          timeLimit: scenario.estimatedMinutes || 15,
          passingScore: (scenario.assessmentData as Record<string, unknown>)?.passingScore as number || 60,
          domains: (scenario.assessmentData as Record<string, unknown>)?.domains as string[] || []
        },
        userProgress: user ? {
          completedPrograms: 0,
          lastAttempt: undefined,
          bestScore: undefined
        } : undefined
      }));
      
      return NextResponse.json({ 
        success: true,
        data: {
          scenarios: formattedScenarios,
          totalCount: formattedScenarios.length
        }
      });
    }
    
    // If no scenarios in database, fall back to file system
    console.log('No scenarios in database, checking file system');
    
    // Skip cache for now to ensure fresh data
    
    console.log('Cache miss, loading scenarios from disk');
    
    // Scan assessment_data directory for folders
    // In Docker, working directory is /app
    const baseDir = process.cwd();
    const assessmentDir = path.join(baseDir, 'public', 'assessment_data');
    
    let folders: string[] = [];
    try {
      const items = await fs.readdir(assessmentDir, { withFileTypes: true });
      folders = items
        .filter(item => item.isDirectory())
        .map(item => item.name)
        .filter(name => name === 'ai_literacy'); // Only use ai_literacy scenario
      console.log('Found assessment folders:', folders);
    } catch (error) {
      console.error('Error reading assessment directory:', error);
    }
    
    // Get all existing scenarios in one batch query (already have scenarioRepo from above)
    const existingScenarios = await scenarioRepo.findActive?.() || [];
    const scenariosByPath = new Map(
      existingScenarios.map((s: IScenario) => {
        const configPath = s.sourceMetadata?.configPath as string | undefined;
        return [configPath, s];
      })
    );
    
    // Process each folder
    const scenarios = await Promise.all(
      folders.map(async (folderName) => {
        try {
          // Look for language-specific config file first, then fallback to English
          const configPath = path.join(assessmentDir, folderName, `${folderName}_questions_${lang}.yaml`);
          const fallbackPath = path.join(assessmentDir, folderName, `${folderName}_questions_en.yaml`);
          let config: AssessmentConfig = {};
          let yamlPath = '';
          
          try {
            // Try language-specific file first
            try {
              const configContent = await fs.readFile(configPath, 'utf-8');
              const yamlData = yamlParse(configContent) as { config?: AssessmentConfig; assessment_config?: AssessmentConfig };
              config = yamlData.config || yamlData.assessment_config || {};
              yamlPath = `assessment_data/${folderName}/${folderName}_questions_${lang}.yaml`;
              console.log(`Loaded ${lang} config for ${folderName}:`, config);
            } catch {
              // Fallback to English if language-specific file doesn't exist
              console.log(`No ${lang} config found, trying English fallback`);
              const configContent = await fs.readFile(fallbackPath, 'utf-8');
              const yamlData = yamlParse(configContent) as { config?: AssessmentConfig; assessment_config?: AssessmentConfig };
              config = yamlData.config || yamlData.assessment_config || {};
              yamlPath = `assessment_data/${folderName}/${folderName}_questions_en.yaml`;
              console.log(`Loaded English config for ${folderName}:`, config);
            }
          } catch (error) {
            console.warn(`No config found for ${folderName} in any language:`, error);
            // If no config files exist, skip this folder
            return null;
          }
          
          // Check if scenario already exists using the cached map
          let scenario = scenariosByPath.get(yamlPath);
          
          // Create scenario if it doesn't exist
          if (!scenario) {
            console.log(`Creating new scenario for ${folderName}`);
            const title = config.title || `${folderName.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} Assessment`;
            const description = config.description || `Assessment for ${folderName.replace(/_/g, ' ')}`;
            
            const createdScenario = await scenarioRepo.create({
              mode: 'assessment',
              status: 'active',
              version: '1.0',
              sourceType: 'yaml',
              sourcePath: yamlPath,
              sourceId: `assessment-${folderName}`,
              sourceMetadata: {
                assessmentType: 'standard',
                folderName,
                configPath: yamlPath
              },
              title: { en: title },
              description: { en: description },
              objectives: [
                'Evaluate your knowledge and skills',
                'Identify areas for improvement',
                'Get personalized recommendations'
              ],
              difficulty: 'intermediate',
              estimatedMinutes: config.time_limit_minutes || 30,
              prerequisites: [],
              taskTemplates: [{
                id: 'assessment-task',
                title: 'Complete Assessment',
                type: 'question',
                description: 'Answer the assessment questions'
              }],
              taskCount: 1,
              xpRewards: { completion: 100 },
              unlockRequirements: {},
              pblData: {},
              discoveryData: {},
              assessmentData: {
                  totalQuestions: config.total_questions || 12,
                  passingScore: config.passing_score || 60,
                  domains: config.domains || []
                },
              aiModules: {},
              resources: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              metadata: {}
            });
            scenario = createdScenario;
          }
          
          return {
            id: scenario.id,
            title: config.title || scenario.title?.[lang] || scenario.title?.en || `${folderName.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} Assessment`,
            description: config.description || scenario.description?.[lang] || scenario.description?.en || `Assessment for ${folderName.replace(/_/g, ' ')}`,
            folderName,
            config: {
              totalQuestions: config.total_questions || 12,
              timeLimit: config.time_limit_minutes || 15,
              passingScore: config.passing_score || 60,
              domains: config.domains || []
            }
          };
        } catch (error) {
          console.error('Error processing folder ' + folderName + ':', error);
          return null;
        }
      })
    );
    
    // Filter out any null results
    const validScenarios = scenarios.filter(s => s !== null);
    
    // Cache removed - using database for data consistency
    
    // Add user progress if authenticated
    const scenariosWithProgress = validScenarios.map(scenario => ({
      ...scenario,
      userProgress: user ? {
        completedPrograms: 0,
        lastAttempt: undefined,
        bestScore: undefined
      } : undefined
    }));
    
    return Response.json({ 
      success: true,
      data: {
        scenarios: scenariosWithProgress,
        totalCount: scenariosWithProgress.length
      }
    });
  } catch (error) {
    console.error('Error in assessment scenarios API:', error);
    return Response.json(
      { success: false, error: 'Failed to load assessment scenarios' },
      { status: 500 }
    );
  }
}