import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// --- 修正後的型別定義 ---
// 移除未使用的 languageCodes
type LanguageCode = 'es' | 'ja' | 'ko' | 'fr' | 'de' | 'ru' | 'it';

// 使用 'unknown' 替代 'any'
type TranslationFields = {
  [key in `${string}_${LanguageCode}`]?: unknown;
};

interface CompetencyYaml extends TranslationFields {
  description: string;
  description_zh?: string;
  scenarios?: string[];
  scenarios_zh?: string[];
  content?: string;
  content_zh?: string;
  knowledge: string[];
  skills: string[];
  attitudes: string[];
}

interface DomainYaml extends TranslationFields {
  overview: string;
  overview_zh?: string;
  competencies: Record<string, CompetencyYaml>;
  emoji?: string;
}

// 修正：KSAItemYaml 現在直接定義，避免空 interface
interface KSAItemYaml extends TranslationFields {
  summary: string;
  summary_zh?: string;
}

interface ThemeYaml extends TranslationFields {
  theme_zh?: string;
  explanation: string;
  explanation_zh?: string;
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

  if (lang.startsWith('zh')) {
    const zhKey = `${fieldName}_zh`;
    return record[zhKey] ?? record[fieldName];
  }

  const langCode = lang.split('-')[0];
  if (langCode !== 'en') {
    const key = `${fieldName}_${langCode}`;
    return record[key] ?? record[fieldName];
  }
  
  return record[fieldName];
};

function loadYaml<T>(filePath: string): T {
  const fullPath = path.join(process.cwd(), 'public', filePath);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  return yaml.load(fileContents) as T;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get('lang') || 'en';

  // 讀取 YAML
  const domainsData = loadYaml<DomainsYaml>('rubrics_data/ai_lit_domains.yaml');
  const ksaData = loadYaml<KSAYaml>('rubrics_data/ksa_codes.yaml');

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

  return NextResponse.json({
    domains: domainList,
    kMap,
    sMap,
    aMap,
  });
} 