import { NextRequest, NextResponse } from 'next/server';
import { AssessmentData } from '../../../types/assessment';
import { contentService } from '@/lib/cms/content-service';
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

    // Read the language-specific assessment data with CMS override support
    const fileName = `ai_literacy_questions_${lang}.yaml`;
    console.log(`Loading assessment data: ${fileName} for language: ${lang}`);
    
    let assessmentData: AssessmentData;
    try {
      assessmentData = await contentService.getContent('question', fileName) as AssessmentData;
      console.log('Assessment data loaded successfully');
      
      if (!assessmentData) {
        throw new Error('No data returned from contentService');
      }
    } catch (loadError) {
      console.error('Error loading content from contentService:', loadError);
      throw loadError;
    }
    
    if (!assessmentData || !assessmentData.assessment_config) {
      console.error('Invalid assessment data structure:', assessmentData);
      return NextResponse.json(
        { error: 'Invalid assessment data' },
        { status: 500 }
      );
    }

    // Utility function to get translated field
    const getTranslatedField = (obj: Record<string, unknown>, fieldName: string, language: string): string => {
      // Language key is already in the correct format (e.g., zhTW, es, ja)
      const langKey = language;
      
      const translatedKey = `${fieldName}_${langKey}`;
      const translatedValue = obj[translatedKey] as string;
      const defaultValue = obj[fieldName] as string;
      
      return translatedValue || defaultValue || '';
    };

    // Helper function to get translated options
    const getTranslatedOptions = (question: Record<string, unknown>, language: string) => {
      const langKey = language;
      
      const optionsKey = `options_${langKey}`;
      const translatedOptions = question[optionsKey];
      const defaultOptions = question.options;
      
      return translatedOptions || defaultOptions;
    };

    // Check if we have the new tasks structure
    if (assessmentData.tasks) {
      // New format with tasks
      const processedTasks = assessmentData.tasks.map(task => ({
        ...task,
        title: getTranslatedField(task as unknown as Record<string, unknown>, 'title', lang),
        description: getTranslatedField(task as unknown as Record<string, unknown>, 'description', lang),
        questions: task.questions.map(question => ({
          ...question,
          question: getTranslatedField(question as unknown as Record<string, unknown>, 'question', lang),
          options: getTranslatedOptions(question as unknown as Record<string, unknown>, lang),
          explanation: getTranslatedField(question as unknown as Record<string, unknown>, 'explanation', lang),
        }))
      }));

      // Flatten all questions from tasks for compatibility
      const allQuestions = processedTasks.flatMap(task => task.questions);
      
      const result = {
        assessment_config: assessmentData.assessment_config,
        tasks: processedTasks,
        questions: allQuestions, // Add flattened questions for backward compatibility
      };
      
      // Store in cache
      await cacheService.set(cacheKey, result, { ttl: 60 * 60 * 1000 }); // 1 hour
      
      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          'X-Cache': 'MISS'
        }
      });
    }
    
    // Legacy format fallback (for backward compatibility)
    const allQuestions: any[] = [];
    const processedDomains: any = {};
    
    // If old format with domains and questions at root
    if ('domains' in assessmentData && 'questions' in assessmentData && assessmentData.domains) {
      Object.entries(assessmentData.domains).forEach(([key, domain]) => {
        processedDomains[key] = {
          ...domain,
          name: key,
          description: domain.description,
        };
      });
      
      assessmentData.questions?.forEach(q => {
        allQuestions.push({
          ...q,
          question: getTranslatedField(q as unknown as Record<string, unknown>, 'question', lang),
          options: getTranslatedOptions(q as unknown as Record<string, unknown>, lang),
          explanation: getTranslatedField(q as unknown as Record<string, unknown>, 'explanation', lang),
        });
      });
    }

    // Return legacy format
    const result = {
      assessment_config: assessmentData.assessment_config,
      domains: processedDomains,
      questions: allQuestions,
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