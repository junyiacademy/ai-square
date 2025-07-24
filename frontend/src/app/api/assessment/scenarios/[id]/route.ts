import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { cachedGET, memoize } from '@/lib/api/optimization-utils';

// Memoized YAML loader
const loadConfigYAML = memoize(async (...args: unknown[]) => {
  const configPath = args[0] as string;
  const baseDir = process.cwd().endsWith('/frontend') ? process.cwd() : path.join(process.cwd(), 'frontend');
  const fullPath = path.join(baseDir, 'public', configPath);
  const configContent = await fs.readFile(fullPath, 'utf-8');
  return yaml.load(configContent);
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
    const configPath = scenario.sourceMetadata?.configPath as string | undefined;
    if (configPath) {
      try {
        const yamlData = await loadConfigYAML(configPath) as {
    config?: {
      total_questions?: number;
      time_limit?: number;
      passing_score?: number;
      domains?: string[];
    };
    title?: string;
    description?: string;
    [key: string]: unknown;
  };
        
        // Extract language-specific content
        const config = yamlData.config || {};
        
        // Get title - ensure it's a string
        let title = yamlData[`title_${lang}`] || yamlData.title;
        if (!title) {
          title = typeof scenario.title === 'string' 
            ? scenario.title 
            : scenario.title?.[lang] || scenario.title?.en || 'Assessment';
        }
        
        // Get description - ensure it's a string
        let description = yamlData[`description_${lang}`] || yamlData.description;
        if (!description) {
          description = typeof scenario.description === 'string'
            ? scenario.description
            : scenario.description?.[lang] || scenario.description?.en || '';
        }
        
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
    // Extract language-specific content from scenario
    const title = typeof scenario.title === 'string' 
      ? scenario.title 
      : scenario.title?.[lang] || scenario.title?.en || 'Assessment';
    const description = typeof scenario.description === 'string'
      ? scenario.description
      : scenario.description?.[lang] || scenario.description?.en || '';
    
    return {
      ...scenario,
      title,
      description,
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