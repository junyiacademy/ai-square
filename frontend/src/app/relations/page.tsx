import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import React from 'react';

// 讀取 YAML 檔案的輔助函式
function loadYaml(filePath: string) {
  const fullPath = path.join(process.cwd(), 'public', filePath);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  return yaml.load(fileContents);
}

function getRelations() {
  // 讀取 domains 與 ksa codes
  const domains = loadYaml('ai_lit_domains.yaml') as any;
  const ksa = loadYaml('ksa_codes.yaml') as any;

  // 建立 code -> summary 對照表
  const kMap: Record<string, string> = {};
  Object.values(ksa.knowledge_codes.themes).forEach((theme: any) => {
    Object.entries(theme.codes).forEach(([code, obj]: any) => {
      kMap[code] = obj.summary;
    });
  });
  const sMap: Record<string, string> = {};
  Object.values(ksa.skill_codes.themes).forEach((theme: any) => {
    Object.entries(theme.codes).forEach(([code, obj]: any) => {
      sMap[code] = obj.summary;
    });
  });
  const aMap: Record<string, string> = {};
  Object.values(ksa.attitude_codes.themes).forEach((theme: any) => {
    Object.entries(theme.codes).forEach(([code, obj]: any) => {
      aMap[code] = obj.summary;
    });
  });

  // 整理每個 competency 的關聯
  const result: any[] = [];
  Object.entries(domains.domains).forEach(([domainKey, domain]: any) => {
    Object.entries(domain.competencies).forEach(([compKey, comp]: any) => {
      result.push({
        domain: domainKey,
        competency: compKey,
        description: comp.description,
        knowledge: (comp.knowledge || []).map((k: string) => ({ code: k, summary: kMap[k] || '' })),
        skills: (comp.skills || []).map((s: string) => ({ theme: s, summary: sMap[s] || '' })),
        attitudes: (comp.attitudes || []).map((a: string) => ({ theme: a, summary: aMap[a] || '' })),
      });
    });
  });
  return result;
}

export default function RelationsPage() {
  const relations = getRelations();
  return (
    <main style={{ padding: 32 }}>
      <h1>Domain–KSA Relations</h1>
      {relations.map((item, idx) => (
        <section key={idx} style={{ marginBottom: 32, borderBottom: '1px solid #eee', paddingBottom: 16 }}>
          <h2>{item.domain} / {item.competency}</h2>
          <p><b>{item.description}</b></p>
          <div>
            <b>Knowledge:</b>
            <ul>
              {item.knowledge.map((k: any) => (
                <li key={k.code}>{k.code}: {k.summary}</li>
              ))}
            </ul>
          </div>
          <div>
            <b>Skills:</b>
            <ul>
              {item.skills.map((s: any) => (
                <li key={s.theme}>{s.theme}: {s.summary}</li>
              ))}
            </ul>
          </div>
          <div>
            <b>Attitudes:</b>
            <ul>
              {item.attitudes.map((a: any) => (
                <li key={a.theme}>{a.theme}: {a.summary}</li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </main>
  );
} 