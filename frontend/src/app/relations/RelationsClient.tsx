'use client';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../../i18n';

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

interface TreeData {
  domains: Domain[];
  kMap: Record<string, KSAItem>;
  sMap: Record<string, KSAItem>;
  aMap: Record<string, KSAItem>;
}

export default function RelationsClient() {
  const { t, i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language);
  const [tree, setTree] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTree = async (lng: string) => {
    setLoading(true);
    const res = await fetch(`/api/relations?lang=${lng}`);
    const data = await res.json();
    setTree(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTree(lang);
  }, [lang]);

  const handleLangChange = (lng: string) => {
    i18n.changeLanguage(lng);
    setLang(lng);
  };

  if (loading || !tree) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-end mb-4">
        <button className={`px-3 py-1 rounded-l ${lang === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`} onClick={() => handleLangChange('en')}>EN</button>
        <button className={`px-3 py-1 rounded-r ${lang === 'zh-TW' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`} onClick={() => handleLangChange('zh-TW')}>繁體中文</button>
      </div>
      <h1 className="mb-8 text-3xl font-bold text-center">{t('pageTitle')}</h1>
      <div className="max-w-3xl mx-auto">
        {tree.domains.map((domain) => (
          <DomainAccordion key={domain.key} domain={domain} kMap={tree.kMap} sMap={tree.sMap} aMap={tree.aMap} lang={lang} />
        ))}
      </div>
    </main>
  );
}

function DomainAccordion({ domain, kMap, sMap, aMap, lang }: { domain: Domain, kMap: Record<string, KSAItem>, sMap: Record<string, KSAItem>, aMap: Record<string, KSAItem>, lang: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const overview = lang === 'zh-TW' && (domain as any).overview_zh ? (domain as any).overview_zh : domain.overview;
  return (
    <div className="mb-6">
      <div
        className="cursor-pointer bg-gradient-to-r from-blue-100 to-purple-100 px-6 py-4 rounded-lg shadow flex items-center justify-between"
        onClick={() => setOpen(o => !o)}
      >
        <div>
          <span className="text-xl font-bold text-blue-800 mr-2">{t(domain.key)}</span>
          <span className="text-gray-700 text-base font-medium">{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div className="bg-white border border-gray-200 rounded-b-lg px-6 py-4">
          <p className="mb-4 text-gray-700">{overview}</p>
          {domain.competencies.map((comp) => (
            <CompetencyAccordion key={comp.key} comp={comp} kMap={kMap} sMap={sMap} aMap={aMap} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompetencyAccordion({ comp, kMap, sMap, aMap, lang }: { comp: Competency, kMap: Record<string, KSAItem>, sMap: Record<string, KSAItem>, aMap: Record<string, KSAItem>, lang: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const description = lang === 'zh-TW' && (comp as any).description_zh ? (comp as any).description_zh : comp.description;
  return (
    <div className="mb-4">
      <div
        className="cursor-pointer bg-gray-100 px-4 py-2 rounded flex items-center justify-between"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-semibold text-blue-700 mr-2">{t(comp.key)}</span>
        <span className="text-gray-700 font-medium flex-1">{description}</span>
        <span className="ml-2">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="bg-white border border-gray-100 rounded-b px-4 py-3 mt-1">
          <KSAList type={t('knowledge')} codes={comp.knowledge} map={kMap} lang={lang} />
          <KSAList type={t('skills')} codes={comp.skills} map={sMap} lang={lang} />
          <KSAList type={t('attitudes')} codes={comp.attitudes} map={aMap} lang={lang} />
        </div>
      )}
    </div>
  );
}

function KSAList({ type, codes, map, lang }: { type: string, codes: string[], map: Record<string, KSAItem>, lang: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="mb-6 flex gap-6 items-start">
      <div className="flex flex-col gap-2 min-w-[80px]">
        <div className="font-bold text-gray-600 mb-1">{type}</div>
        {codes.map((code: string) => (
          <span
            key={code}
            className={`inline-block px-3 py-1 rounded text-sm font-semibold cursor-pointer mb-1 transition-all ${selected === code ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-800'}`}
            onClick={() => setSelected(code)}
          >
            {code}
          </span>
        ))}
      </div>
      <div className="flex-1 min-h-[120px]">
        {selected ? (
          <KSACard code={selected} info={map[selected]} lang={lang} />
        ) : (
          <div className="text-gray-400 italic mt-8">請點選左側代碼以檢視詳細內容</div>
        )}
      </div>
    </div>
  );
}

function KSACard({ code, info, lang }: { code: string, info: KSAItem, lang: string }) {
  const { t } = useTranslation();
  if (!info) return null;
  const summary = lang === 'zh-TW' && (info as any).summary_zh ? (info as any).summary_zh : info.summary;
  const themeKey = info.theme;
  const theme = t(themeKey);
  const explanation = lang === 'zh-TW' && (info as any).explanation_zh ? (info as any).explanation_zh : info.explanation;
  return (
    <div className="bg-white border border-blue-200 rounded-xl px-4 py-3 shadow-lg transition-all duration-200 max-w-2xl">
      <div className="flex items-center mb-2">
        <span className="text-blue-600 text-xl font-extrabold mr-2">🔎</span>
        <span className="text-lg font-bold text-blue-800 leading-snug">{summary}</span>
      </div>
      <div className="flex items-center mb-2">
        <span className="bg-blue-100 text-blue-700 rounded-full px-3 py-0.5 text-xs font-semibold mr-2">{t('theme')}</span>
        <span className="text-blue-700 text-sm font-medium">{theme}</span>
      </div>
      {explanation && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mt-2 text-gray-700 text-sm whitespace-pre-line">
          {explanation}
        </div>
      )}
    </div>
  );
} 