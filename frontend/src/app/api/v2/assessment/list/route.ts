import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

interface AssessmentConfig {
  id: string;
  title: string;
  description: string;
  total_questions: number;
  time_limit_minutes: number;
  passing_score: number;
  domains: string[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lang = searchParams.get('lang') || 'en';
    
    // Get all directories in assessment_data
    const assessmentDataPath = path.join(process.cwd(), 'public', 'assessment_data');
    const entries = await fs.readdir(assessmentDataPath, { withFileTypes: true });
    
    // Filter only directories (scenarios)
    const scenarioDirs = entries.filter(entry => entry.isDirectory());
    
    const assessments = [];
    
    for (const dir of scenarioDirs) {
      try {
        // Look for language-specific YAML file
        const yamlPath = path.join(
          assessmentDataPath,
          dir.name,
          `${dir.name}_questions_${lang}.yaml`
        );
        
        // Check if file exists, fallback to English if not
        let finalPath = yamlPath;
        try {
          await fs.access(yamlPath);
        } catch {
          // Fallback to English
          finalPath = path.join(
            assessmentDataPath,
            dir.name,
            `${dir.name}_questions_en.yaml`
          );
        }
        
        const yamlContent = await fs.readFile(finalPath, 'utf8');
        const data = yaml.load(yamlContent) as any;
        
        if (data.assessment_config) {
          const config = data.assessment_config as AssessmentConfig;
          const domains = data.domains;
          
          assessments.push({
            id: config.id,
            type: 'assessment', // All are assessments
            title: config.title,
            description: config.description,
            duration: config.time_limit_minutes,
            questionCount: config.total_questions,
            passingScore: config.passing_score,
            difficulty: 'mixed', // Can be derived from questions if needed
            domains: Object.keys(domains).map(domain => ({
              id: domain,
              name: domain.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              description: domains[domain].description,
              questionCount: domains[domain].questions
            })),
            isAvailable: true,
            popularity: Math.floor(Math.random() * 30) + 70, // Mock for now
            completionRate: Math.floor(Math.random() * 20) + 70, // Mock for now
            badge: `${config.title} Certified`
          });
        }
      } catch (error) {
        console.error(`Error loading assessment ${dir.name}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      data: assessments
    });
    
  } catch (error) {
    console.error('Error loading assessments:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load assessments',
      data: []
    }, { status: 500 });
  }
}