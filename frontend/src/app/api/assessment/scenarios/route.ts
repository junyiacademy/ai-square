import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getScenarioRepository } from '@/lib/implementations/gcs-v2';
import { getUserFromRequest } from '@/lib/auth/auth-utils';

interface AssessmentConfig {
  title?: string;
  description?: string;
  total_questions?: number;
  time_limit?: number;
  passing_score?: number;
  domains?: string[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';
    const user = await getUserFromRequest(request);
    
    // Scan assessment_data directory for folders
    const baseDir = process.cwd().endsWith('/frontend') ? process.cwd() : path.join(process.cwd(), 'frontend');
    const assessmentDir = path.join(baseDir, 'public', 'assessment_data');
    
    let folders: string[] = [];
    try {
      const items = await fs.readdir(assessmentDir, { withFileTypes: true });
      folders = items
        .filter(item => item.isDirectory())
        .map(item => item.name);
    } catch (error) {
      console.error('Error reading assessment directory:', error);
    }
    
    // Get scenario repository
    const scenarioRepo = getScenarioRepository();
    
    // Process each folder
    const scenarios = await Promise.all(
      folders.map(async (folderName) => {
        try {
          // Look for config file in the folder
          const configPath = path.join(assessmentDir, folderName, `${folderName}_questions.yaml`);
          let config: AssessmentConfig = {};
          
          try {
            const configContent = await fs.readFile(configPath, 'utf-8');
            const yamlData = yaml.load(configContent) as any;
            config = yamlData.config || {};
          } catch (error) {
            console.warn(`No config found for ${folderName}`);
          }
          
          // Check if scenario already exists
          let scenario = await scenarioRepo.findByYamlPath(`assessment_data/${folderName}/${folderName}_questions.yaml`);
          
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
                  configPath: `assessment_data/${folderName}/${folderName}_questions.yaml`
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