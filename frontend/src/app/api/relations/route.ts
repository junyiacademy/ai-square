import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// --- 擴充後的型別定義 ---
const languages = ['es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];

type TranslationFields<T> = {
  [P in keyof T]?: T[P];
} & {
  [key in `${string}_${(typeof languages)[number]}`]?: any;
};

interface CompetencyYaml extends TranslationFields<{
  description: string;
  description_zh?: string;
  scenarios?: string[];
  scenarios_zh?: string[];
  content?: string;
  content_zh?: string;
}> {
  knowledge: string[];
  skills: string[];
  attitudes: string[];
}

interface DomainYaml extends TranslationFields<{
  overview: string;
  overview_zh?: string;
}> {
  competencies: Record<string, CompetencyYaml>;
  emoji?: string;
}

interface KSAItemYaml extends TranslationFields<{
  summary: string;
  summary_zh?: string;
}> {}

interface ThemeYaml extends TranslationFields<{
  theme_zh?: string;
  explanation: string;
  explanation_zh?: string;
}> {
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

// --- 通用的翻譯輔助函式 ---
const getTranslatedField = (lang: string, item: any, fieldName: string) => {
  if (!item) return null;

  // 1. 處理繁體中文的特殊情況 (zh-TW -> _zh)
  if (lang.startsWith('zh')) {
    return item[`${fieldName}_zh`] || item[fieldName];
  }

  // 2. 處理所有其他語言 (es -> _es, ja -> _ja, etc.)
  const langCode = lang.split('-')[0];
  if (langCode !== 'en') {
    const key = `${fieldName}_${langCode}`;
    return item[key] || item[fieldName];
  }
  
  // 3. 預設回傳英文
  return item[fieldName];
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
    const map: Record<string, { summary: string; theme: string; explanation?: string }> = {};
    Object.entries(themes).forEach(([themeKey, themeObj]) => {
      // 這裡我們假設 theme 的 key (如 "Engaging with AI") 本身不需要翻譯，而是由前端 t() 函式處理
      // 但 themeObj 內部的 explanation 需要翻譯
      const explanation = getTranslatedField(lang, themeObj, 'explanation');
      Object.entries(themeObj.codes).forEach(([code, obj]) => {
        map[code] = {
          summary: getTranslatedField(lang, obj, 'summary'),
          theme: themeKey, // 傳遞 key 給前端，讓 t() 函式去翻譯
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