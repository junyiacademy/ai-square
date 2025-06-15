import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import React from 'react';
import RelationsClient from './RelationsClient';
import { useTranslation } from 'react-i18next';

// 定義型別
interface Competency {
  key: string;
  description: string;
  knowledge: string[];
  skills: string[];
  attitudes: string[];
}

interface Domain {
  key: string;
  overview: string;
  competencies: Competency[];
}

interface KSAItem {
  summary: string;
  theme: string;
  explanation?: string;
}

interface KSATheme {
  codes: Record<string, KSAItem>;
  explanation?: string;
}

interface KSAData {
  knowledge_codes: { themes: Record<string, KSATheme> };
  skill_codes: { themes: Record<string, KSATheme> };
  attitude_codes: { themes: Record<string, KSATheme> };
}

interface DomainsYaml {
  domains: Record<string, {
    overview: string;
    competencies: Record<string, {
      description: string;
      knowledge?: string[];
      skills?: string[];
      attitudes?: string[];
    }>;
  }>;
}

function loadYaml<T>(filePath: string): T {
  const fullPath = path.join(process.cwd(), 'public', filePath);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  return yaml.load(fileContents) as T;
}

function getDomainTree() {
  // 讀取 domains 與 ksa codes
  const domains = loadYaml<DomainsYaml>('ai_lit_domains.yaml');
  const ksa = loadYaml<KSAData>('ksa_codes.yaml');
  // 建立 code -> summary 對照表
  const kMap: Record<string, KSAItem> = {};
  Object.entries(ksa.knowledge_codes.themes).forEach(([theme, themeObj]) => {
    Object.entries(themeObj.codes).forEach(([code, obj]) => {
      kMap[code] = { summary: obj.summary, theme, explanation: themeObj.explanation };
    });
  });
  const sMap: Record<string, KSAItem> = {};
  Object.entries(ksa.skill_codes.themes).forEach(([theme, themeObj]) => {
    Object.entries(themeObj.codes).forEach(([code, obj]) => {
      sMap[code] = { summary: obj.summary, theme, explanation: themeObj.explanation };
    });
  });
  const aMap: Record<string, KSAItem> = {};
  Object.entries(ksa.attitude_codes.themes).forEach(([theme, themeObj]) => {
    Object.entries(themeObj.codes).forEach(([code, obj]) => {
      aMap[code] = { summary: obj.summary, theme, explanation: themeObj.explanation };
    });
  });
  // domains tree 結構
  const domainList: Domain[] = [];
  Object.entries(domains.domains).forEach(([domainKey, domain]) => {
    const competencies: Competency[] = [];
    Object.entries(domain.competencies).forEach(([compKey, comp]) => {
      competencies.push({
        key: compKey,
        description: comp.description,
        knowledge: comp.knowledge || [],
        skills: comp.skills || [],
        attitudes: comp.attitudes || [],
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
  return (
    <RelationsClient />
  );
} 