import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { cachedGET, memoize } from '@/lib/api/optimization-utils';

// Memoized YAML loader
const loadConfigYAML = memoize(async (configPath: string) => {
  const baseDir = process.cwd().endsWith('/frontend') ? process.cwd() : path.join(process.cwd(), 'frontend');
  const fullPath = path.join(baseDir, 'public', configPath);
  const configContent = await fs.readFile(fullPath, 'utf-8');
  return yaml.load(configContent) as any;
}, 10 * 60 * 1000); // 10 minutes cache

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'en';
  
  // Await params before using
  const { id } = await params;

  return cachedGET(request, async () => {
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    const scenario = await scenarioRepo.findById(id);
    
    if (!scenario) {
      throw new Error('Scenario not found');
    }
    
    // Load config from YAML file if available
    if (scenario.sourceRef.metadata?.configPath) {
      try {
        const yamlData = await loadConfigYAML(scenario.sourceRef.metadata.configPath as string);
        
        // Extract language-specific content
        const config = yamlData.config || {};
        const title = yamlData[`title_${lang}`] || yamlData.title || scenario.title;
        const description = yamlData[`description_${lang}`] || yamlData.description || scenario.description;
        
        return {
          ...scenario,
          title,
          description,
          config: {
            totalQuestions: config.total_questions || 12,
            timeLimit: config.time_limit || 15,
            passingScore: config.passing_score || 60,
            domains: config.domains || []
          }
        };
      } catch (error) {
        console.error('Error loading config:', error);
      }
    }
    
    // Return scenario with default config if YAML loading fails
    return {
      ...scenario,
      config: {
        totalQuestions: 12,
        timeLimit: 15,
        passingScore: 60,
        domains: []
      }
    };
  }, {
    ttl: 600, // 10 minutes cache
    staleWhileRevalidate: 3600 // 1 hour
  });
}