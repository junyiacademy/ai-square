import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface AssessmentQuestion {
  id: string;
  domain: string;
  difficulty: string;
  type: string;
  question: string;
  question_zhTW?: string;
  question_es?: string;
  question_ja?: string;
  question_ko?: string;
  question_fr?: string;
  question_de?: string;
  question_ru?: string;
  question_it?: string;
  options: Record<string, string>;
  options_zhTW?: Record<string, string>;
  options_es?: Record<string, string>;
  options_ja?: Record<string, string>;
  options_ko?: Record<string, string>;
  options_fr?: Record<string, string>;
  options_de?: Record<string, string>;
  options_ru?: Record<string, string>;
  options_it?: Record<string, string>;
  correct_answer: string;
  explanation: string;
  explanation_zhTW?: string;
  explanation_es?: string;
  explanation_ja?: string;
  explanation_ko?: string;
  explanation_fr?: string;
  explanation_de?: string;
  explanation_ru?: string;
  explanation_it?: string;
  ksa_mapping: {
    knowledge: string[];
    skills: string[];
    attitudes: string[];
  };
}

interface AssessmentData {
  assessment_config: {
    total_questions: number;
    time_limit_minutes: number;
    passing_score: number;
    domains: string[];
  };
  domains: Record<string, {
    description: string;
    questions: number;
  }>;
  questions: AssessmentQuestion[];
}

export async function GET(request: NextRequest) {
  try {
    // Get parameters from query
    const searchParams = request.nextUrl.searchParams;
    const lang = searchParams.get('lang') || 'en';
    const assessmentId = searchParams.get('id') || 'ai_literacy';
    const type = searchParams.get('type') || 'assessment';
    const limit = parseInt(searchParams.get('limit') || '0');
    
    // Load assessment questions from the specific assessment folder
    const yamlPath = path.join(
      process.cwd(), 
      'public', 
      'assessment_data', 
      assessmentId,
      `${assessmentId}_questions_${lang}.yaml`
    );
    
    // Check if file exists, fallback to English if not
    let finalPath = yamlPath;
    try {
      await fs.access(yamlPath);
    } catch {
      // Fallback to English
      finalPath = path.join(
        process.cwd(), 
        'public', 
        'assessment_data', 
        assessmentId,
        `${assessmentId}_questions_en.yaml`
      );
    }
    
    const yamlContent = await fs.readFile(finalPath, 'utf8');
    const data = yaml.load(yamlContent) as AssessmentData;
    
    // Filter questions based on assessment config
    const { assessment_config, questions } = data;
    
    // Randomly select questions from each domain
    const selectedQuestions: AssessmentQuestion[] = [];
    const questionsPerDomain = Math.floor(assessment_config.total_questions / assessment_config.domains.length);
    
    for (const domain of assessment_config.domains) {
      const domainQuestions = questions.filter(q => q.domain === domain);
      const shuffled = domainQuestions.sort(() => Math.random() - 0.5);
      selectedQuestions.push(...shuffled.slice(0, questionsPerDomain));
    }
    
    // If we need more questions to reach total, add randomly
    while (selectedQuestions.length < assessment_config.total_questions) {
      const remainingQuestions = questions.filter(q => !selectedQuestions.includes(q));
      if (remainingQuestions.length === 0) break;
      const randomIndex = Math.floor(Math.random() * remainingQuestions.length);
      selectedQuestions.push(remainingQuestions[randomIndex]);
    }
    
    // Apply limit if specified
    const finalQuestions = limit > 0 
      ? selectedQuestions.slice(0, limit)
      : selectedQuestions;
    
    return NextResponse.json({
      config: assessment_config,
      questions: finalQuestions,
      domains: data.domains
    });
  } catch (error) {
    console.error('Error loading assessment questions:', error);
    return NextResponse.json(
      { error: 'Failed to load assessment questions' },
      { status: 500 }
    );
  }
}