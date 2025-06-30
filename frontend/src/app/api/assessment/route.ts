import { NextRequest, NextResponse } from 'next/server';
import { AssessmentData } from '../../../types/assessment';
import { contentService } from '@/lib/cms/content-service';
import { cacheService } from '@/lib/cache/cache-service';

export const revalidate = 3600; // Revalidate every hour

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

    // Read the assessment data with CMS override support
    const assessmentData = await contentService.getContent('question', 'ai_literacy_questions.yaml') as AssessmentData;

    // Utility function to get translated field
    const getTranslatedField = (obj: Record<string, unknown>, fieldName: string, language: string): string => {
      // 處理 zh-TW -> zh_TW 的轉換
      let langKey = language.replace('-', '_');
      
      // 對於中文，使用 zh 而不是 zh_TW
      if (langKey === 'zh_TW') {
        langKey = 'zh';
      }
      
      const translatedKey = `${fieldName}_${langKey}`;
      const translatedValue = obj[translatedKey] as string;
      const defaultValue = obj[fieldName] as string;
      
      return translatedValue || defaultValue || '';
    };

    // Helper function to get translated options
    const getTranslatedOptions = (question: Record<string, unknown>, language: string) => {
      let langKey = language.replace('-', '_');
      
      // 對於中文，使用 zh 而不是 zh_TW
      if (langKey === 'zh_TW') {
        langKey = 'zh';
      }
      
      const optionsKey = `options_${langKey}`;
      const translatedOptions = question[optionsKey];
      const defaultOptions = question.options;
      
      return translatedOptions || defaultOptions;
    };

    // Process domains - names are now handled by i18n on frontend
    const processedDomains = Object.entries(assessmentData.domains).reduce((acc, [key, domain]) => {
      acc[key as keyof typeof assessmentData.domains] = {
        ...domain,
        // Domain names are now handled by i18n in frontend
        // Using the key for consistency
        name: key,
        description: domain.description,
      };
      return acc;
    }, {} as typeof assessmentData.domains);

    // Process questions with translations
    const processedQuestions = assessmentData.questions.map(question => ({
      ...question,
      question: getTranslatedField(question as unknown as Record<string, unknown>, 'question', lang),
      options: getTranslatedOptions(question as unknown as Record<string, unknown>, lang),
      explanation: getTranslatedField(question as unknown as Record<string, unknown>, 'explanation', lang),
    }));

    // Return processed data
    const result = {
      assessment_config: assessmentData.assessment_config,
      domains: processedDomains,
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
    console.error('Error loading assessment data:', error);
    return NextResponse.json(
      { error: 'Failed to load assessment data' },
      { status: 500 }
    );
  }
}