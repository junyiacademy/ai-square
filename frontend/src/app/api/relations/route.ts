import { NextRequest, NextResponse } from 'next/server';
import { contentService } from '@/lib/cms/content-service';
import { cacheService } from '@/lib/cache/cache-service';

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
interface KSAYaml {
  knowledge_codes: KSAThemesYaml;
  skill_codes: KSAThemesYaml;
  attitude_codes: KSAThemesYaml;
}

// --- 通用的翻譯輔助函式 (修正版) ---
const getTranslatedField = (lang: string, item: object | null, fieldName: string): unknown => {
  if (!item) return null;

  const record = item as Record<string, unknown>;

  if (lang === 'zhTW') {
    const zhKey = `${fieldName}_zhTW`;
    return record[zhKey] ?? record[fieldName];
  }

  const langCode = lang.split('-')[0];
  if (langCode !== 'en') {
    const key = `${fieldName}_${langCode}`;
    return record[key] ?? record[fieldName];
  }
  
  return record[fieldName];
};


export const revalidate = 3600; // Revalidate every hour
export const runtime = 'nodejs'; // Use Node.js runtime for better performance

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get('lang') || 'en';
  
  // 使用快取
  const cacheKey = `relations:${lang}`;
  const cached = await cacheService.get(cacheKey);
  
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-Cache': 'HIT'
      }
    });
  }

  // 讀取 YAML with CMS override support
  const domainsData = await contentService.getContent('domain', 'ai_lit_domains.yaml') as DomainsYaml;
  const ksaData = await contentService.getContent('ksa', 'ksa_codes.yaml') as KSAYaml;

  // --- 使用通則函式處理 domains ---
  const domainList = Object.entries(domainsData.domains).map(([domainKey, domain]) => ({
    key: domainKey,
    overview: getTranslatedField(lang, domain, 'overview'),
    emoji: domain.emoji,
    competencies: Object.entries(domain.competencies).map(([compKey, comp]) => ({
      key: compKey,
      description: getTranslatedField(lang, comp, 'description'),
      knowledge: comp.knowledge || [],
      skills: comp.skills || [],
      attitudes: comp.attitudes || [],
      scenarios: getTranslatedField(lang, comp, 'scenarios') || [],
      content: getTranslatedField(lang, comp, 'content') || '',
    })),
  }));

  // --- 使用通則函式處理 KSA ---
  function mapKSA(themes: Record<string, ThemeYaml>) {
    const map: Record<string, { summary: unknown; theme: string; explanation?: unknown }> = {};
    Object.entries(themes).forEach(([themeKey, themeObj]) => {
      const explanation = getTranslatedField(lang, themeObj, 'explanation');
      Object.entries(themeObj.codes).forEach(([code, obj]) => {
        map[code] = {
          summary: getTranslatedField(lang, obj, 'summary'),
          theme: themeKey,
          explanation,
        };
      });
    });
    return map;
  }
  
  const kMap = mapKSA(ksaData.knowledge_codes.themes);
  const sMap = mapKSA(ksaData.skill_codes.themes);
  const aMap = mapKSA(ksaData.attitude_codes.themes);

  const result = {
    domains: domainList,
    kMap,
    sMap,
    aMap,
  };
  
  // 存入快取
  await cacheService.set(cacheKey, result, { ttl: 60 * 60 * 1000 }); // 1 hour
  
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Cache': 'MISS'
    }
  });
} 