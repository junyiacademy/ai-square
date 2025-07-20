'use client';
import React, { useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import '../../i18n';
import Image from 'next/image';
import { contentService } from '@/services/content-service';
import { LoadingAccordion } from '@/components/ui/loading-skeleton';

interface Competency {
  id: string;
  key?: string;
  description: string;
  description_zhTW?: string;
  description_es?: string;
  description_ja?: string;
  description_ko?: string;
  description_fr?: string;
  description_de?: string;
  description_ru?: string;
  description_it?: string;
  knowledge: string[];
  skills: string[];
  attitudes: string[];
  scenarios?: string[];
  scenarios_zhTW?: string[];
  scenarios_es?: string[];
  scenarios_ja?: string[];
  scenarios_ko?: string[];
  scenarios_fr?: string[];
  scenarios_de?: string[];
  scenarios_ru?: string[];
  scenarios_it?: string[];
  content?: string;
  content_zhTW?: string;
  content_es?: string;
  content_ja?: string;
  content_ko?: string;
  content_fr?: string;
  content_de?: string;
  content_ru?: string;
  content_it?: string;
}

interface Domain {
  id: string;
  key?: string;
  name: string;
  overview: string;
  overview_zhTW?: string;
  overview_es?: string;
  overview_ja?: string;
  overview_ko?: string;
  overview_fr?: string;
  overview_de?: string;
  overview_ru?: string;
  overview_it?: string;
  competencies: Competency[];
  emoji?: string;
}

interface KSAItem {
  summary: string;
  summary_zhTW?: string;
  summary_es?: string;
  summary_ja?: string;
  summary_ko?: string;
  summary_fr?: string;
  summary_de?: string;
  summary_ru?: string;
  summary_it?: string;
  theme: string;
  explanation?: string;
  explanation_zhTW?: string;
  explanation_es?: string;
  explanation_ja?: string;
  explanation_ko?: string;
  explanation_fr?: string;
  explanation_de?: string;
  explanation_ru?: string;
  explanation_it?: string;
}

interface TreeData {
  domains: Domain[];
  ksa?: {
    knowledge: {
      themes: Array<{
        id: string;
        name: string;
        explanation: string;
        items: Array<{
          code: string;
          summary: string;
        }>;
      }>;
    };
    skills: {
      themes: Array<{
        id: string;
        name: string;
        explanation: string;
        items: Array<{
          code: string;
          summary: string;
        }>;
      }>;
    };
    attitudes: {
      themes: Array<{
        id: string;
        name: string;
        explanation: string;
        items: Array<{
          code: string;
          summary: string;
        }>;
      }>;
    };
  };
  // Legacy structure - for backward compatibility
  kMap?: Record<string, KSAItem>;
  sMap?: Record<string, KSAItem>;
  aMap?: Record<string, KSAItem>;
}

/**
 * 簡化的翻譯輔助函式
 * 由於所有語言現在都使用獨立的 YAML 檔案，API 會根據語言參數載入對應檔案，
 * 直接返回已翻譯的內容在基本欄位中
 */
const getTranslatedText = (lang: string, item: object | null, fieldName: string): unknown => {
  if (!item) return '';
  const record = item as Record<string, unknown>;
  return record[fieldName];
};

export default function RelationsClient() {
  const { t, i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language);
  const [tree, setTree] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化時同步語言狀態
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('ai-square-language');
      if (savedLang && savedLang !== i18n.language) {
        i18n.changeLanguage(savedLang);
        setLang(savedLang);
      }
    }
  }, [i18n]);

  // 監聽語言變化事件
  useEffect(() => {
    const handleLanguageChange = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const newLang = customEvent.detail.language;
      setLang(newLang);
      // Clear cache for the old language when language changes
      await contentService.clearLanguageCache(lang);
    };

    window.addEventListener('language-changed', handleLanguageChange);
    return () => {
      window.removeEventListener('language-changed', handleLanguageChange);
    };
  }, [lang]);

  const fetchTree = async (lng: string) => {
    setLoading(true);
    try {
      const data = await contentService.getRelationsTree(lng);
      
      // Always create the maps for compatibility
      const kMap: Record<string, KSAItem> = {};
      const sMap: Record<string, KSAItem> = {};
      const aMap: Record<string, KSAItem> = {};
      
      // If new API structure, convert it
      if (data.ksa) {
        // Process knowledge items
        if (data.ksa.knowledge && data.ksa.knowledge.themes) {
          Object.values(data.ksa.knowledge.themes).forEach((theme: Record<string, unknown>) => {
            if (theme.codes && typeof theme.codes === 'object') {
              Object.entries(theme.codes).forEach(([code, item]: [string, Record<string, unknown>]) => {
                kMap[code] = {
                  summary: String(item.summary || ''),
                  theme: String(theme.name || ''),
                  explanation: theme.explanation ? String(theme.explanation) : undefined
                };
              });
            }
          });
        }
        
        // Process skills items
        if (data.ksa.skills && data.ksa.skills.themes) {
          Object.values(data.ksa.skills.themes).forEach((theme: Record<string, unknown>) => {
            if (theme.codes && typeof theme.codes === 'object') {
              Object.entries(theme.codes).forEach(([code, item]: [string, Record<string, unknown>]) => {
                sMap[code] = {
                  summary: String(item.summary || ''),
                  theme: String(theme.name || ''),
                  explanation: theme.explanation ? String(theme.explanation) : undefined
                };
              });
            }
          });
        }
        
        // Process attitudes items
        if (data.ksa.attitudes && data.ksa.attitudes.themes) {
          Object.values(data.ksa.attitudes.themes).forEach((theme: Record<string, unknown>) => {
            if (theme.codes && typeof theme.codes === 'object') {
              Object.entries(theme.codes).forEach(([code, item]: [string, Record<string, unknown>]) => {
                aMap[code] = {
                  summary: String(item.summary || ''),
                  theme: String(theme.name || ''),
                  explanation: theme.explanation ? String(theme.explanation) : undefined
                };
              });
            }
          });
        }
      } else if (data.kMap && data.sMap && data.aMap) {
        // Legacy structure - use existing maps
        Object.assign(kMap, data.kMap);
        Object.assign(sMap, data.sMap);
        Object.assign(aMap, data.aMap);
      }
      
      const treeData: TreeData = {
        domains: (data.domains as unknown as Domain[]) || [],
        kMap,
        sMap,
        aMap,
        ksa: data.ksa as TreeData['ksa']
      };
      
      setTree(treeData);
    } catch (error) {
      console.error('Failed to load relations tree:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree(lang);
  }, [lang]);

  if (loading || !tree) {
    return (
      <main className="p-8 bg-gray-50 min-h-screen">
        <div className="w-full flex justify-center mb-6">
          <div className="w-[320px] h-[120px] bg-gradient-to-r from-blue-200 to-purple-200 rounded-2xl animate-pulse" />
        </div>
        <div className="max-w-3xl mx-auto">
          <LoadingAccordion />
        </div>
      </main>
    );
  }

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <h1 className="mb-2 text-xl sm:text-2xl md:text-3xl font-bold text-center px-4 break-words">{t('pageTitle')}</h1>
      <p className="text-center text-gray-500 mb-4 px-4">{t('pageSubtitle')}</p>
      <div className="text-center mb-8">
        <a 
          href="https://ailiteracyframework.org/wp-content/uploads/2025/05/AILitFramework_ReviewDraft.pdf" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {t('frameworkResource')}
        </a>
      </div>
      <div className="max-w-3xl mx-auto">
        {tree.domains.map((domain) => (
          <DomainAccordion 
            key={domain.id || domain.key} 
            domain={domain} 
            kMap={tree.kMap || {}} 
            sMap={tree.sMap || {}} 
            aMap={tree.aMap || {}} 
            lang={lang} 
            emoji={domain.emoji || '🤖'} 
          />
        ))}
      </div>
    </main>
  );
}

function DomainAccordion({ domain, kMap, sMap, aMap, lang, emoji }: { domain: Domain, kMap: Record<string, KSAItem>, sMap: Record<string, KSAItem>, aMap: Record<string, KSAItem>, lang: string, emoji: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  // 使用通則函式，並斷言回傳型別為 string
  const overview = getTranslatedText(lang, domain, 'overview') as string;
  const imgSrc = `/images/${domain.id || domain.key}.png`;
  return (
    <div className="mb-6">
      <div
        className="cursor-pointer bg-gradient-to-r from-blue-100 to-purple-100 px-6 py-4 rounded-lg shadow flex items-center justify-between"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center">
          <span className="text-2xl mr-3">{emoji}</span>
          <span className="text-lg sm:text-xl font-bold text-blue-800 mr-2">{domain.name || t(domain.id || domain.key || '')}</span>
          <span className="text-gray-700 text-base font-medium">{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div className="bg-white border border-gray-200 rounded-b-lg px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-start gap-4 mb-4">
            <div className="w-full md:w-56 max-w-xs md:max-w-[224px] mb-2 md:mb-0 md:mr-6">
              <Image
                src={imgSrc}
                alt={domain.name || t(domain.id || domain.key || '')}
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
            <CompetencyAccordion key={comp.id || comp.key} comp={comp} kMap={kMap} sMap={sMap} aMap={aMap} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompetencyAccordion({ comp, kMap, sMap, aMap, lang }: { comp: Competency, kMap: Record<string, KSAItem>, sMap: Record<string, KSAItem>, aMap: Record<string, KSAItem>, lang: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  // 使用通則函式，並斷言對應的型別
  const description = getTranslatedText(lang, comp, 'description') as string;
  const scenarios = getTranslatedText(lang, comp, 'scenarios') as string[];
  const content = getTranslatedText(lang, comp, 'content') as string;
  return (
    <div className="mb-4">
      <div
        className="cursor-pointer bg-gray-100 px-4 py-2 rounded flex items-center justify-between"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-semibold text-blue-700 mr-2">{comp.id || comp.key || ''}</span>
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
                  {scenarios.map((s: string, i: number) => (
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
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-lg p-4 max-h-[90vh] overflow-y-auto">
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
  // 使用通則函式，並斷言回傳型別為 string
  const summary = getTranslatedText(lang, info, 'summary') as string;
  const themeKey = info.theme;
  const theme = t(themeKey);
  const explanation = getTranslatedText(lang, info, 'explanation') as string;
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