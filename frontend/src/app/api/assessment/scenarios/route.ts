import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getScenarioRepository } from '@/lib/implementations/gcs-v2';
import { getServerSession } from '@/lib/auth/session';

interface AssessmentConfig {
  title?: string;
  description?: string;
  total_questions?: number;
  time_limit_minutes?: number;
  passing_score?: number;
  domains?: string[];
}

// In-memory cache for scenarios
let scenariosCache: {
  data: any[] | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';
    const session = await getServerSession();
    const user = session?.user;
    
    // Check cache first
    const now = Date.now();
    if (scenariosCache.data && (now - scenariosCache.timestamp) < CACHE_TTL) {
      console.log('Returning cached scenarios');
      
      // Add user progress if authenticated
      const scenariosWithProgress = scenariosCache.data.map(scenario => ({
        ...scenario,
        userProgress: user ? {
          completedPrograms: 0,
          lastAttempt: undefined,
          bestScore: undefined
        } : undefined
      }));
      
      return NextResponse.json({ 
        success: true,
        data: {
          scenarios: scenariosWithProgress,
          totalCount: scenariosWithProgress.length
        }
      });
    }
    
    console.log('Cache miss, loading scenarios from disk');
    
    // Scan assessment_data directory for folders
    const baseDir = process.cwd().endsWith('/frontend') ? process.cwd() : path.join(process.cwd(), 'frontend');
    const assessmentDir = path.join(baseDir, 'public', 'assessment_data');
    
    let folders: string[] = [];
    try {
      const items = await fs.readdir(assessmentDir, { withFileTypes: true });
      folders = items
        .filter(item => item.isDirectory())
        .map(item => item.name);
      console.log('Found assessment folders:', folders);
    } catch (error) {
      console.error('Error reading assessment directory:', error);
    }
    
    // Get scenario repository
    const scenarioRepo = getScenarioRepository();
    
    // Get all existing scenarios in one batch query
    const existingScenarios = await scenarioRepo.findAll();
    const scenariosByPath = new Map(
      existingScenarios.map(s => [s.sourceRef?.metadata?.configPath, s])
    );
    
    // Process each folder
    const scenarios = await Promise.all(
      folders.map(async (folderName) => {
        try {
          // Look for language-specific config file first, then fallback to English
          let configPath = path.join(assessmentDir, folderName, `${folderName}_questions_${lang}.yaml`);
          let fallbackPath = path.join(assessmentDir, folderName, `${folderName}_questions_en.yaml`);
          let config: AssessmentConfig = {};
          let yamlPath = '';
          
          try {
            // Try language-specific file first
            try {
              const configContent = await fs.readFile(configPath, 'utf-8');
              const yamlData = yaml.load(configContent) as any;
              config = yamlData.config || yamlData.assessment_config || {};
              yamlPath = `assessment_data/${folderName}/${folderName}_questions_${lang}.yaml`;
              console.log(`Loaded ${lang} config for ${folderName}:`, config);
            } catch (error) {
              // Fallback to English if language-specific file doesn't exist
              console.log(`No ${lang} config found, trying English fallback`);
              const configContent = await fs.readFile(fallbackPath, 'utf-8');
              const yamlData = yaml.load(configContent) as any;
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
            scenario = await scenarioRepo.create({
              sourceType: 'assessment',
              sourceRef: {
                type: 'yaml',
                sourceId: `assessment-${folderName}`,
                metadata: {
                  assessmentType: 'standard',
                  folderName,
                  configPath: yamlPath
                }
              },
              title: config.title || `${folderName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Assessment`,
              description: config.description || `Assessment for ${folderName.replace(/_/g, ' ')}`,
              objectives: [
                'Evaluate your knowledge and skills',
                'Identify areas for improvement',
                'Get personalized recommendations'
              ],
              taskTemplates: [{
                id: 'assessment-task',
                title: 'Complete Assessment',
                type: 'question',
              }],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
          
          return {
            id: scenario.id,
            title: scenario.title,
            description: scenario.description,
            folderName,
            config: {
              totalQuestions: config.total_questions || 12,
              timeLimit: config.time_limit_minutes || 15,
              passingScore: config.passing_score || 60,
              domains: config.domains || []
            }
          };
        } catch (error) {
          console.error(`Error processing folder ${folderName}:`, error);
          return null;
        }
      })
    );
    
    // Filter out any null results
    const validScenarios = scenarios.filter(s => s !== null);
    
    // Update cache
    scenariosCache = {
      data: validScenarios,
      timestamp: now
    };
    
    // Add user progress if authenticated
    const scenariosWithProgress = validScenarios.map(scenario => ({
      ...scenario,
      userProgress: user ? {
        completedPrograms: 0,
        lastAttempt: undefined,
        bestScore: undefined
      } : undefined
    }));
    
    return NextResponse.json({ 
      success: true,
      data: {
        scenarios: scenariosWithProgress,
        totalCount: scenariosWithProgress.length
      }
    });
  } catch (error) {
    console.error('Error in assessment scenarios API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load assessment scenarios' },
      { status: 500 }
    );
  }
}