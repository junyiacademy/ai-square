import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// 型別定義
interface CompetencyYaml {
  description: string;
  description_zh?: string;
  knowledge: string[];
  skills: string[];
  attitudes: string[];
  scenarios?: string[];
  scenarios_zh?: string[];
  content?: string;
  content_zh?: string;
}
interface DomainYaml {
  overview: string;
  overview_zh?: string;
  competencies: Record<string, CompetencyYaml>;
}
interface DomainsYaml {
  domains: Record<string, DomainYaml>;
}

interface KSAItemYaml {
  summary: string;
  summary_zh?: string;
}
interface ThemeYaml {
  theme_zh?: string;
  explanation: string;
  explanation_zh?: string;
  codes: Record<string, KSAItemYaml>;
}
interface KSAThemesYaml {
  themes: Record<string, ThemeYaml>;
}
interface KSAYaml {
  knowledge_codes: KSAThemesYaml;
  skill_codes: KSAThemesYaml;
  attitude_codes: KSAThemesYaml;
}

function loadYaml<T>(filePath: string): T {
  const fullPath = path.join(process.cwd(), 'public', filePath);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  return yaml.load(fileContents) as T;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let lang = searchParams.get('lang') || 'en';
  if (lang.startsWith('zh')) lang = 'zh-TW';
  else lang = 'en';

  // 讀取 YAML
  const domains = loadYaml<DomainsYaml>('ai_lit_domains.yaml');
  const ksa = loadYaml<KSAYaml>('ksa_codes.yaml');

  // domains
  const domainList = Object.entries(domains.domains).map(([domainKey, domain]) => ({
    key: domainKey,
    overview: lang === 'zh-TW' && domain.overview_zh ? domain.overview_zh : domain.overview,
    competencies: Object.entries(domain.competencies).map(([compKey, comp]) => ({
      key: compKey,
      description: lang === 'zh-TW' && comp.description_zh ? comp.description_zh : comp.description,
      knowledge: comp.knowledge || [],
      skills: comp.skills || [],
      attitudes: comp.attitudes || [],
      scenarios: comp.scenarios || [],
      scenarios_zh: comp.scenarios_zh || [],
      content: comp.content || '',
      content_zh: comp.content_zh || '',
    })),
  }));

  // KSA
  function mapKSA(themes: Record<string, ThemeYaml>) {
    const map: Record<string, { summary: string; theme: string; explanation?: string }> = {};
    Object.entries(themes).forEach(([theme, themeObj]) => {
      const themeLabel = lang === 'zh-TW' && themeObj.theme_zh ? themeObj.theme_zh : theme;
      const explanation = lang === 'zh-TW' && themeObj.explanation_zh ? themeObj.explanation_zh : themeObj.explanation;
      Object.entries(themeObj.codes).forEach(([code, obj]) => {
        map[code] = {
          summary: lang === 'zh-TW' && obj.summary_zh ? obj.summary_zh : obj.summary,
          theme: themeLabel,
          explanation,
        };
      });
    });
    return map;
  }
  const kMap = mapKSA(ksa.knowledge_codes.themes);
  const sMap = mapKSA(ksa.skill_codes.themes);
  const aMap = mapKSA(ksa.attitude_codes.themes);

  return NextResponse.json({
    domains: domainList,
    kMap,
    sMap,
    aMap,
  });
} 