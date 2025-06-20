'use client';
import React, { useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import '../../i18n';
import Image from 'next/image';

interface Competency {
  key: string;
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

interface Domain {
  key: string;
  overview: string;
  overview_zh?: string;
  competencies: Competency[];
  emoji?: string;
}

interface KSAItem {
  summary: string;
  summary_zh?: string;
  theme: string;
  explanation?: string;
  explanation_zh?: string;
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

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'zh-TW', name: '繁體中文' },
    { code: 'es', name: 'Español' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'ru', name: 'Русский' },
    { code: 'it', name: 'Italiano' },
  ];

  if (loading || !tree) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  // 假插圖區塊
  const fakeIllustration = (
    <div className="w-full flex justify-center mb-6">
      <div className="w-[320px] h-[120px] bg-gradient-to-r from-blue-200 to-purple-200 rounded-2xl flex items-center justify-center text-3xl text-blue-500 font-bold">
        Fake Illustration
      </div>
    </div>
  );

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-end mb-4">
        <select
          onChange={(e) => handleLangChange(e.target.value)}
          value={lang}
          className="bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </select>
      </div>
      {fakeIllustration}
      <h1 className="mb-2 text-3xl font-bold text-center">{t('pageTitle')}</h1>
      <p className="text-center text-gray-500 mb-8">{t('pageSubtitle')}</p>
      <div className="max-w-3xl mx-auto">
        {tree.domains.map((domain) => (
          <DomainAccordion key={domain.key} domain={domain} kMap={tree.kMap} sMap={tree.sMap} aMap={tree.aMap} lang={lang} emoji={domain.emoji || '🤖'} />
        ))}
      </div>
    </main>
  );
}

function DomainAccordion({ domain, kMap, sMap, aMap, lang, emoji }: { domain: Domain, kMap: Record<string, KSAItem>, sMap: Record<string, KSAItem>, aMap: Record<string, KSAItem>, lang: string, emoji: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const overview = lang === 'zh-TW' && (domain.overview_zh) ? domain.overview_zh : domain.overview;
  // 圖片路徑自動對應 domain.key
  const imgSrc = `/images/${domain.key}.png`;
  return (
    <div className="mb-6">
      <div
        className="cursor-pointer bg-gradient-to-r from-blue-100 to-purple-100 px-6 py-4 rounded-lg shadow flex items-center justify-between"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center">
          <span className="text-2xl mr-3">{emoji}</span>
          <span className="text-xl font-bold text-blue-800 mr-2">{t(domain.key)}</span>
          <span className="text-gray-700 text-base font-medium">{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div className="bg-white border border-gray-200 rounded-b-lg px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-start gap-4 mb-4">
            <div className="w-full md:w-56 max-w-xs md:max-w-[224px] mb-2 md:mb-0 md:mr-6">
              <Image
                src={imgSrc}
                alt={t(domain.key)}
                width={400}
                height={240}
                className="rounded-xl shadow-md object-cover"
                style={{background: '#f3f4f6'}}
                sizes="(max-width: 768px) 100vw, 224px"
                priority={true}
              />
            </div>
            <p className="text-gray-700 flex-1">{overview}</p>
          </div>
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
  const description = lang === 'zh-TW' && (comp.description_zh) ? comp.description_zh : comp.description;
  const scenarios = lang === 'zh-TW' && comp.scenarios_zh ? comp.scenarios_zh : comp.scenarios;
  const content = lang === 'zh-TW' && comp.content_zh ? comp.content_zh : comp.content;
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
        <div className="bg-white border border-blue-100 rounded-xl px-6 py-4 mt-2 shadow-md">
          <div className="mb-4">
            {content && (
              <div className="text-base font-bold text-blue-900 mb-2 whitespace-pre-line">{content}</div>
            )}
            {scenarios && scenarios.length > 0 && (
              <div>
                <div className="font-bold text-gray-600 mb-1">{t('scenarios')}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  {scenarios.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-gray-800 text-sm">
                      <span className="mt-0.5">📘</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="bg-gray-50 rounded-lg shadow-inner p-4 md:p-8">
              <div className="mb-4 px-4 py-2">
                <div className="text-lg font-bold text-blue-700 flex items-center gap-2 mb-1">
                  <span>🧭</span>
                  <span>{t('ksaTitle')}</span>
                </div>
                <div className="text-gray-600 text-sm">{t('ksaDescription')}</div>
              </div>
              <div className="px-4">
                <KSAList type={<span className="flex items-center gap-1 text-blue-700 font-semibold"><span>📖</span>{t('knowledge')}</span>} codes={comp.knowledge} map={kMap} lang={lang} />
                <KSAList type={<span className="flex items-center gap-1 text-green-700 font-semibold"><span>🛠️</span>{t('skills')}</span>} codes={comp.skills} map={sMap} lang={lang} />
                <KSAList type={<span className="flex items-center gap-1 text-yellow-700 font-semibold"><span>💡</span>{t('attitudes')}</span>} codes={comp.attitudes} map={aMap} lang={lang} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

function KSAOverlay({ open, onClose, info, lang }: { open: boolean, onClose: () => void, info: KSAItem | null, lang: string }) {
  if (!open || !info) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center md:hidden">
      <div className="absolute inset-0 bg-black bg-opacity-60" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-lg p-4 max-h-[90vh] overflow-y-auto animate-slideup">
        <button className="absolute right-4 top-3 text-2xl text-gray-400" onClick={onClose} aria-label="關閉">✕</button>
        <KSACard info={info} lang={lang} />
      </div>
    </div>
  );
}

function KSAList({ type, codes, map, lang }: { type: ReactNode, codes: string[], map: Record<string, KSAItem>, lang: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const isMobile = useIsMobile();
  return (
    <div className="mb-6 flex flex-col md:flex-row gap-6 items-start">
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
      {!isMobile && (
        <div className="w-full flex-1 min-h-[120px]">
          {selected ? (
            <KSACard info={map[selected]} lang={lang} />
          ) : (
            <div className="text-gray-400 italic mt-8">請點選左側代碼以檢視詳細內容</div>
          )}
        </div>
      )}
      <KSAOverlay open={isMobile && !!selected} onClose={() => setSelected(null)} info={selected ? map[selected] : null} lang={lang} />
    </div>
  );
}

function KSACard({ info, lang }: { info: KSAItem, lang: string }) {
  const { t } = useTranslation();
  if (!info) return null;
  const summary = lang === 'zh-TW' && info.summary_zh ? info.summary_zh : info.summary;
  const themeKey = info.theme;
  const theme = t(themeKey);
  const explanation = lang === 'zh-TW' && info.explanation_zh ? info.explanation_zh : info.explanation;
  return (
    <div className="w-full max-w-md mx-auto bg-white border border-blue-200 rounded-lg md:rounded-xl p-3 md:p-4 shadow-lg transition-all duration-200">
      <div className="flex items-center mb-2">
        <span className="text-blue-600 text-lg md:text-xl font-extrabold mr-2">🔎</span>
        <span className="text-base md:text-lg font-bold text-blue-800 leading-snug break-words">{summary}</span>
      </div>
      <div className="flex flex-col md:flex-row items-start md:items-center mb-2 gap-2">
        <span className="bg-blue-100 text-blue-700 rounded-full px-3 py-0.5 text-xs font-semibold mr-2 mb-1 md:mb-0">{t('theme')}</span>
        <span className="text-blue-700 text-sm md:text-base font-medium break-words">{theme}</span>
      </div>
      {explanation && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mt-2 text-gray-700 text-sm md:text-base whitespace-pre-line break-words">
          {explanation}
        </div>
      )}
    </div>
  );
}

/* 加入簡單動畫 */
<style jsx global>{`
@keyframes slideup {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.animate-slideup { animation: slideup 0.2s cubic-bezier(0.4,0,0.2,1); }
`}</style>