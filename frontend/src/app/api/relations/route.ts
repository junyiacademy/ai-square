import { NextRequest, NextResponse } from 'next/server';
import { contentService } from '@/lib/cms/content-service';
import { cacheService } from '@/lib/cache/cache-service';
import { jsonYamlLoader } from '@/lib/json-yaml-loader';

// --- 修正後的型別定義 ---
// 移除未使用的 languageCodes
type LanguageCode = 'es' | 'ja' | 'ko' | 'fr' | 'de' | 'ru' | 'it';

// 使用 'unknown' 替代 'any'
type TranslationFields = {
  [key in `${string}_${LanguageCode}`]?: unknown;
};

interface CompetencyYaml extends TranslationFields {
  description: string;
  description_zhTW?: string;
  scenarios?: string[];
  scenarios_zhTW?: string[];
  content?: string;
  content_zhTW?: string;
  knowledge: string[];
  skills: string[];
  attitudes: string[];
}

interface DomainYaml extends TranslationFields {
  overview: string;
  overview_zhTW?: string;
  competencies: Record<string, CompetencyYaml>;
  emoji?: string;
}

// 修正：KSAItemYaml 現在直接定義，避免空 interface
interface KSAItemYaml extends TranslationFields {
  summary: string;
  summary_zhTW?: string;
}

interface ThemeYaml extends TranslationFields {
  theme_zhTW?: string;
  explanation: string;
  explanation_zhTW?: string;
  codes: Record<string, KSAItemYaml>;
}

interface DomainsYaml {
  domains: Record<string, DomainYaml>;
}
interface KSAThemesYaml {
  themes: Record<string, ThemeYaml>;
}
interface KSACodesYaml {
  knowledge_codes: KSAThemesYaml;
  skill_codes: KSAThemesYaml;
  attitude_codes: KSAThemesYaml;
}

// Response types for API
interface CompetencyResponse {
  id: string;
  description: string;
  knowledge: string[];
  skills: string[];
  attitudes: string[];
  scenarios?: string[];
  content?: string;
}

interface DomainResponse {
  id: string;
  name: string;
  overview: string;
  competencies: CompetencyResponse[];
  emoji?: string;
}

interface KSAItemResponse {
  code: string;
  summary: string;
}

interface ThemeResponse {
  id: string;
  name: string;
  explanation: string;
  items: KSAItemResponse[];
}

interface KSADataResponse {
  themes: ThemeResponse[];
}

// Helper function to get translated field
function getTranslatedField(
  obj: Record<string, unknown>,
  fieldName: string,
  lang: string
): string | string[] | undefined {
  // Try exact match first
  const fieldKey = lang === 'en' ? fieldName : `${fieldName}_${lang}`;
  const value = obj[fieldKey];
  if (value !== undefined) {
    return value as string | string[];
  }

  // Fallback to English
  const englishValue = obj[fieldName];
  if (englishValue !== undefined) {
    return englishValue as string | string[];
  }

  return undefined;
}

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang') || 'en';
  const cacheKey = `relations-${lang}`;

  try {
    // Check cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Load data using the new hybrid loader
    const [domainsData, ksaCodesData] = await Promise.all([
      jsonYamlLoader.load<DomainsYaml>('ai_lit_domains', { preferJson: true }),
      jsonYamlLoader.load<KSACodesYaml>('ksa_codes', { preferJson: true })
    ]);

    if (!domainsData || !ksaCodesData) {
      return NextResponse.json(
        { error: 'Failed to load data files' },
        { status: 500 }
      );
    }

    // Process domains
    const domains: DomainResponse[] = Object.entries(domainsData.domains).map(
      ([domainId, domain]) => ({
        id: domainId,
        name: domainId.replace(/_/g, ' '),
        overview: getTranslatedField(domain, 'overview', lang) as string || domain.overview,
        emoji: domain.emoji,
        competencies: Object.entries(domain.competencies).map(
          ([compId, comp]) => ({
            id: compId,
            description: getTranslatedField(comp, 'description', lang) as string || comp.description,
            knowledge: comp.knowledge || [],
            skills: comp.skills || [],
            attitudes: comp.attitudes || [],
            scenarios: getTranslatedField(comp, 'scenarios', lang) as string[] || comp.scenarios,
            content: getTranslatedField(comp, 'content', lang) as string || comp.content
          })
        )
      })
    );

    // Process KSA data
    const processKSASection = (section: KSAThemesYaml): KSADataResponse => ({
      themes: Object.entries(section.themes).map(([themeId, theme]) => ({
        id: themeId,
        name: getTranslatedField(theme, 'theme', lang) as string || themeId.replace(/_/g, ' '),
        explanation: getTranslatedField(theme, 'explanation', lang) as string || theme.explanation || '',
        items: Object.entries(theme.codes).map(([code, item]) => ({
          code,
          summary: getTranslatedField(item, 'summary', lang) as string || item.summary
        }))
      }))
    });

    const responseData = {
      domains,
      ksa: {
        knowledge: processKSASection(ksaCodesData.knowledge_codes),
        skills: processKSASection(ksaCodesData.skill_codes),
        attitudes: processKSASection(ksaCodesData.attitude_codes)
      }
    };

    // Cache the response
    await cacheService.set(cacheKey, responseData, 300); // 5 minutes

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error loading relations data:', error);
    
    // Try using content service as fallback
    try {
      const fallbackData = await contentService.getContent(
        lang === 'zhTW' ? 'zh-TW' : lang,
        'ai_lit_domains.yaml'
      );
      
      if (fallbackData) {
        return NextResponse.json({ domains: [], ksa: { knowledge: { themes: [] }, skills: { themes: [] }, attitudes: { themes: [] } } });
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
    
    return NextResponse.json(
      { error: 'Failed to load relations data' },
      { status: 500 }
    );
  }
}