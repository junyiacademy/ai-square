import { NextRequest, NextResponse } from 'next/server';
import { getScenarioRepository } from '@/lib/implementations/gcs-v2';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';
    
    // Await params before using
    const { id } = await params;
    
    const scenarioRepo = getScenarioRepository();
    const scenario = await scenarioRepo.findById(id);
    
    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }
    
    // Load config from YAML file if available
    if (scenario.sourceRef.metadata?.configPath) {
      try {
        const baseDir = process.cwd().endsWith('/frontend') ? process.cwd() : path.join(process.cwd(), 'frontend');
        const configPath = path.join(baseDir, 'public', scenario.sourceRef.metadata.configPath as string);
        const configContent = await fs.readFile(configPath, 'utf-8');
        const yamlData = yaml.load(configContent) as any;
        
        // Extract language-specific content
        const config = yamlData.config || {};
        const title = yamlData[`title_${lang}`] || yamlData.title || scenario.title;
        const description = yamlData[`description_${lang}`] || yamlData.description || scenario.description;
        
        return NextResponse.json({
          ...scenario,
          title,
          description,
          config: {
            totalQuestions: config.total_questions || 12,
            timeLimit: config.time_limit || 15,
            passingScore: config.passing_score || 60,
            domains: config.domains || []
          }
        });
      } catch (error) {
        console.error('Error loading config:', error);
      }
    }
    
    // Return scenario with default config if YAML loading fails
    return NextResponse.json({
      ...scenario,
      config: {
        totalQuestions: 12,
        timeLimit: 15,
        passingScore: 60,
        domains: []
      }
    });
  } catch (error) {
    console.error('Error getting scenario:', error);
    return NextResponse.json(
      { error: 'Failed to load scenario' },
      { status: 500 }
    );
  }
}