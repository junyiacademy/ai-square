import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

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
  const domains = loadYaml<any>('ai_lit_domains.yaml');
  const ksa = loadYaml<any>('ksa_codes.yaml');

  // domains
  const domainList = Object.entries(domains.domains).map(([domainKey, domain]: any) => ({
    key: domainKey,
    overview: lang === 'zh-TW' && domain.overview_zh ? domain.overview_zh : domain.overview,
    competencies: Object.entries(domain.competencies).map(([compKey, comp]: any) => ({
      key: compKey,
      description: lang === 'zh-TW' && comp.description_zh ? comp.description_zh : comp.description,
      knowledge: comp.knowledge || [],
      skills: comp.skills || [],
      attitudes: comp.attitudes || [],
    })),
  }));

  // KSA
  function mapKSA(themes: any) {
    const map: Record<string, any> = {};
    Object.entries(themes).forEach(([theme, themeObj]: any) => {
      const themeLabel = lang === 'zh-TW' && themeObj.theme_zh ? themeObj.theme_zh : theme;
      const explanation = lang === 'zh-TW' && themeObj.explanation_zh ? themeObj.explanation_zh : themeObj.explanation;
      Object.entries(themeObj.codes).forEach(([code, obj]: any) => {
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