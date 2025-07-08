import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lang = searchParams.get('lang') || 'en';
    
    // Load assessment configuration from YAML
    const yamlPath = path.join(
      process.cwd(),
      'public',
      'assessment_data',
      `ai_literacy_questions_${lang}.yaml`
    );
    
    const yamlContent = await fs.readFile(yamlPath, 'utf8');
    const data = yaml.load(yamlContent) as any;
    
    // Extract configuration
    const config = data.assessment_config;
    const domains = data.domains;
    const questionCount = data.questions?.length || config.total_questions;
    
    // Build assessment info
    const assessmentInfo = {
      id: 'comprehensive',
      type: 'comprehensive',
      title: 'Comprehensive AI Literacy Assessment',
      description: 'An in-depth evaluation covering all aspects of AI literacy with detailed feedback.',
      duration: config.time_limit_minutes,
      questionCount: questionCount,
      passingScore: config.passing_score,
      difficulty: 'mixed',
      domains: Object.keys(domains).map(domain => ({
        id: domain,
        name: domain.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: domains[domain].description,
        questionCount: domains[domain].questions
      })),
      totalQuestions: questionCount,
      isAvailable: true,
      popularity: 78, // These could be fetched from analytics
      completionRate: 72,
      badge: 'AI Literacy Foundation'
    };
    
    return NextResponse.json({
      success: true,
      data: assessmentInfo
    });
    
  } catch (error) {
    console.error('Error loading assessment config:', error);
    
    // Return default values if file not found
    return NextResponse.json({
      success: true,
      data: {
        id: 'comprehensive',
        type: 'comprehensive',
        title: 'Comprehensive AI Literacy Assessment',
        description: 'An in-depth evaluation covering all aspects of AI literacy with detailed feedback.',
        duration: 15,
        questionCount: 12,
        passingScore: 60,
        difficulty: 'mixed',
        domains: [
          {
            id: 'engaging_with_ai',
            name: 'Engaging With AI',
            description: 'Understanding and effectively communicating with AI systems',
            questionCount: 3
          },
          {
            id: 'creating_with_ai',
            name: 'Creating With AI',
            description: 'Using AI tools to enhance creativity and productivity',
            questionCount: 3
          },
          {
            id: 'managing_with_ai',
            name: 'Managing With AI',
            description: 'Understanding AI limitations, privacy, and ethical considerations',
            questionCount: 3
          },
          {
            id: 'designing_with_ai',
            name: 'Designing With AI',
            description: 'Strategic thinking about AI implementation and innovation',
            questionCount: 3
          }
        ],
        totalQuestions: 12,
        isAvailable: true,
        popularity: 78,
        completionRate: 72,
        badge: 'AI Literacy Foundation'
      }
    });
  }
}