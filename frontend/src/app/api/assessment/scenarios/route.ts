import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getScenarioRepository } from '@/lib/implementations/gcs-v2';
import { getAuthFromRequest } from '@/lib/auth/auth-utils';

interface AssessmentConfig {
  title?: string;
  description?: string;
  total_questions?: number;
  time_limit_minutes?: number;
  passing_score?: number;
  domains?: string[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';
    const user = await getAuthFromRequest(request);
    
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
          
          // Check if scenario already exists using the actual yaml path
          let scenario = await scenarioRepo.findByYamlPath(yamlPath);
          
          // Create scenario if it doesn't exist
          if (!scenario) {
            scenario = await scenarioRepo.create({
              sourceType: 'assessment',
              sourceRef: {
                type: 'structured',
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
                type: 'assessment',
              }]
            });
          }
          
          // Get user progress if authenticated
          let userProgress = undefined;
          if (user) {
            // This would query program repository for user's attempts
            // For now, returning mock data
            userProgress = {
              completedPrograms: 0,
              lastAttempt: undefined,
              bestScore: undefined
            };
          }
          
          return {
            id: scenario.id,
            title: scenario.title,
            description: scenario.description,
            folderName,
            config: {
              totalQuestions: config.total_questions || 12,
              timeLimit: config.time_limit || 15,
              passingScore: config.passing_score || 60,
              domains: config.domains || []
            },
            userProgress
          };
        } catch (error) {
          console.error(`Error processing folder ${folderName}:`, error);
          return null;
        }
      })
    );
    
    // Filter out any null results
    const validScenarios = scenarios.filter(s => s !== null);
    
    return NextResponse.json({ 
      scenarios: validScenarios,
      totalCount: validScenarios.length 
    });
  } catch (error) {
    console.error('Error in assessment scenarios API:', error);
    return NextResponse.json(
      { error: 'Failed to load assessment scenarios' },
      { status: 500 }
    );
  }
}