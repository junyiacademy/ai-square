import { NextRequest, NextResponse } from 'next/server';
import { AssessmentData } from '../../../types/assessment';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { cacheService } from '@/lib/cache/cache-service';

export const revalidate = 3600; // Revalidate every hour
export const dynamic = 'force-dynamic'; // Force dynamic rendering

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';
    
    // Use cache
    const cacheKey = `assessment:${lang}`;
    const cached = await cacheService.get(cacheKey);
    
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          'X-Cache': 'HIT'
        }
      });
    }

    // Load assessment scenarios from database
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    const scenarios = await scenarioRepo.findByMode('assessment');
    
    if (!scenarios || scenarios.length === 0) {
      return NextResponse.json(
        { error: 'No assessment scenarios found' },
        { status: 404 }
      );
    }
    
    // Get the first active assessment scenario
    const activeScenario = scenarios.find(s => s.status === 'active') || scenarios[0];
    
    console.log(`Loading assessment data from database for scenario: ${activeScenario.id}`);
    
    // Convert scenario data to AssessmentData format
    let assessmentData: AssessmentData; // eslint-disable-line @typescript-eslint/no-unused-vars
    try {
      // Extract assessment data from the scenario
      const assessmentConfig = activeScenario.assessmentData?.config || {
        total_questions: 20,
        time_limit_minutes: 30,
        passing_score: 70
      };
      
      // Get questions from assessment data based on language
      let rawQuestions = [];
      if (activeScenario.assessmentData?.questions) {
        // Questions are stored by language
        rawQuestions = activeScenario.assessmentData.questions[lang] || 
                      activeScenario.assessmentData.questions['en'] || 
                      [];
      } else if (activeScenario.taskTemplates) {
        // Fallback to task templates
        rawQuestions = activeScenario.taskTemplates;
      }
      
      // Get domains from assessment data
      const domains = activeScenario.assessmentData?.domains || {
        engaging_with_ai: { name: 'Engaging with AI', description: 'Understanding AI interactions', questions: 5 },
        creating_with_ai: { name: 'Creating with AI', description: 'Using AI for creation', questions: 5 },
        managing_with_ai: { name: 'Managing AI', description: 'Managing AI systems', questions: 5 },
        designing_with_ai: { name: 'Designing AI', description: 'Designing AI solutions', questions: 5 }
      };
      
      // Process questions to ensure they have the correct structure
      const processedQuestions = rawQuestions.map((q: Record<string, unknown>) => {
        // Handle multilingual fields
        const question = typeof q.question === 'object' ? q.question[lang] || q.question.en : q.question;
        const options = q.options;
        const explanation = typeof q.explanation === 'object' ? q.explanation[lang] || q.explanation.en : q.explanation;
        
        return {
          ...q,
          question,
          options,
          explanation,
          domain: q.domain || 'engaging_with_ai' // Default domain if not specified
        };
      });
      
      // Return the assessment data
      const result = {
        assessment_config: assessmentConfig,
        domains: domains,
        questions: processedQuestions,
      };
      
      // Store in cache
      await cacheService.set(cacheKey, result, { ttl: 60 * 60 * 1000 }); // 1 hour
      
      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          'X-Cache': 'MISS'
        }
      });
      
    } catch (error) {
      console.error('Error processing assessment data:', error);
      throw error;
    }

  } catch (error) {
    console.error('Error loading assessment data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load assessment data',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}