import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import React from 'react';
import RelationsClient from './RelationsClient';

// 讀取 YAML 檔案的輔助函式
function loadYaml(filePath: string) {
  const fullPath = path.join(process.cwd(), 'public', filePath);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  return yaml.load(fileContents);
}

function getDomainTree() {
  // 讀取 domains 與 ksa codes
  const domains = loadYaml('ai_lit_domains.yaml') as any;
  const ksa = loadYaml('ksa_codes.yaml') as any;

  // 建立 code -> summary 對照表
  const kMap: Record<string, {summary: string, theme: string, explanation?: string}> = {};
  Object.entries(ksa.knowledge_codes.themes).forEach(([theme, themeObj]: any) => {
    Object.entries(themeObj.codes).forEach(([code, obj]: any) => {
      kMap[code] = { summary: obj.summary, theme, explanation: themeObj.explanation };
    });
  });
  const sMap: Record<string, {summary: string, theme: string, explanation?: string}> = {};
  Object.entries(ksa.skill_codes.themes).forEach(([theme, themeObj]: any) => {
    Object.entries(themeObj.codes).forEach(([code, obj]: any) => {
      sMap[code] = { summary: obj.summary, theme, explanation: themeObj.explanation };
    });
  });
  const aMap: Record<string, {summary: string, theme: string, explanation?: string}> = {};
  Object.entries(ksa.attitude_codes.themes).forEach(([theme, themeObj]: any) => {
    Object.entries(themeObj.codes).forEach(([code, obj]: any) => {
      aMap[code] = { summary: obj.summary, theme, explanation: themeObj.explanation };
    });
  });

  // domains tree 結構
  const domainList: any[] = [];
  Object.entries(domains.domains).forEach(([domainKey, domain]: any) => {
    const competencies: any[] = [];
    Object.entries(domain.competencies).forEach(([compKey, comp]: any) => {
      competencies.push({
        key: compKey,
        description: comp.description,
        knowledge: (comp.knowledge || []),
        skills: (comp.skills || []),
        attitudes: (comp.attitudes || []),
      });
    });
    domainList.push({
      key: domainKey,
      overview: domain.overview,
      competencies,
    });
  });
  return {
    domains: domainList,
    kMap,
    sMap,
    aMap,
  };
}

export default function RelationsPage() {
  const tree = getDomainTree();
  return (
    <RelationsClient tree={tree} />
  );
} 