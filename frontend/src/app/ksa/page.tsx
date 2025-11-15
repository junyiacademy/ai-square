'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface KSACode {
  summary: string;
  questions?: string[];
}

interface KSATheme {
  codes: Record<string, KSACode>;
  explanation: string;
}

interface KSAData {
  description: string;
  themes: Record<string, KSATheme>;
}

interface KSAResponse {
  knowledge_codes: KSAData;
  skill_codes: KSAData;
  attitude_codes: KSAData;
}

export default function KSADisplayPage() {
  const { t, i18n } = useTranslation('ksa');
  const [ksaData, setKsaData] = useState<KSAResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'knowledge' | 'skills' | 'attitudes'>('knowledge');
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchKSAData = async () => {
      try {
        const response = await fetch(`/api/ksa?lang=${i18n.language}`);
        const data = await response.json();
        setKsaData(data);
      } catch (error) {
        console.error('Failed to fetch KSA data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchKSAData();
  }, [i18n.language]);

  const toggleTheme = (themeKey: string) => {
    const newExpanded = new Set(expandedThemes);
    if (newExpanded.has(themeKey)) {
      newExpanded.delete(themeKey);
    } else {
      newExpanded.add(themeKey);
    }
    setExpandedThemes(newExpanded);
  };

  const getSectionData = (section: string) => {
    switch (section) {
      case 'knowledge':
        return ksaData?.knowledge_codes;
      case 'skills':
        return ksaData?.skill_codes;
      case 'attitudes':
        return ksaData?.attitude_codes;
      default:
        return null;
    }
  };

  const formatThemeName = (themeName: string) => {
    return themeName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const filterThemes = (themes: Record<string, KSATheme>) => {
    if (!searchTerm) return themes;

    const filtered: Record<string, KSATheme> = {};
    Object.entries(themes).forEach(([themeKey, theme]) => {
      const themeMatches = formatThemeName(themeKey).toLowerCase().includes(searchTerm.toLowerCase()) ||
                          theme.explanation.toLowerCase().includes(searchTerm.toLowerCase());

      const matchingCodes: Record<string, KSACode> = {};
      Object.entries(theme.codes).forEach(([codeKey, code]) => {
        if (themeMatches ||
            code.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
            codeKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (code.questions && code.questions.some(q => q.toLowerCase().includes(searchTerm.toLowerCase())))) {
          matchingCodes[codeKey] = code;
        }
      });

      if (themeMatches || Object.keys(matchingCodes).length > 0) {
        filtered[themeKey] = { ...theme, codes: matchingCodes };
      }
    });

    return filtered;
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!ksaData) {
    return <div className="p-8 text-center text-red-600">{t('loadError')}</div>;
  }

  const currentSectionData = getSectionData(activeSection);

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
        {/* Header */}
        <h1 className="mb-2 text-xl sm:text-2xl md:text-3xl font-bold text-center px-4 break-words">{t('title')}</h1>
        <p className="text-center text-gray-500 mb-8 px-4">{t('subtitle')}</p>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mb-8 px-4">
          <div className="relative">
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 pr-4 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Section Navigation */}
        <div className="flex flex-col sm:flex-row justify-center mb-8 gap-2 px-4">
          {[
            { key: 'knowledge' as const, label: `${t('sections.knowledge')} (${t('sections.knowledgeShort')})`, shortLabel: t('sections.knowledgeShort'), count: Object.keys(ksaData.knowledge_codes.themes).length },
            { key: 'skills' as const, label: `${t('sections.skills')} (${t('sections.skillsShort')})`, shortLabel: t('sections.skillsShort'), count: Object.keys(ksaData.skill_codes.themes).length },
            { key: 'attitudes' as const, label: `${t('sections.attitudes')} (${t('sections.attitudesShort')})`, shortLabel: t('sections.attitudesShort'), count: Object.keys(ksaData.attitude_codes.themes).length }
          ].map((section) => (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              className={`px-4 py-3 sm:px-6 rounded-lg font-semibold transition-all duration-200 text-center ${
                activeSection === section.key
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-indigo-50 shadow-md'
              }`}
            >
              <span className="hidden sm:inline">{section.label}</span>
              <span className="sm:hidden text-lg">{section.shortLabel}</span>
              <span className="ml-2 px-2 py-1 text-xs rounded-full bg-opacity-20 bg-black">
                {section.count}
              </span>
            </button>
          ))}
        </div>

        {/* Section Description */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 capitalize">
              {t(`sections.${activeSection}`)}
            </h2>
            <p className="text-gray-600 leading-relaxed">
              {currentSectionData?.description}
            </p>
          </div>
        </div>

        {/* Results Info */}
        {searchTerm && (
          <div className="text-center mb-6">
            <p className="text-gray-600">
              {searchTerm ?
                t('results.themesFoundFor', { count: Object.keys(filterThemes(currentSectionData?.themes || {})).length, search: searchTerm }) :
                t('results.themesFound', { count: Object.keys(filterThemes(currentSectionData?.themes || {})).length })
              }
            </p>
          </div>
        )}

        {/* Themes Grid */}
        <div className="max-w-3xl mx-auto space-y-6">
          {currentSectionData && Object.entries(filterThemes(currentSectionData.themes)).length === 0 ? (
            <div className="col-span-full text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.034 0-3.9.785-5.291 2.09M6.343 6.343A8 8 0 1017.657 17.657 8 8 0 006.343 6.343z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t('results.noResults')}</h3>
              <p className="mt-1 text-sm text-gray-500">{t('results.noResultsHint')}</p>
            </div>
          ) : (
            currentSectionData && Object.entries(filterThemes(currentSectionData.themes)).map(([themeKey, theme]) => (
            <div key={themeKey} className="mb-6">
              <div
                className="cursor-pointer bg-gradient-to-r from-blue-100 to-purple-100 px-6 py-4 rounded-lg shadow flex items-center justify-between"
                onClick={() => toggleTheme(themeKey)}
              >
                <div className="flex items-center">
                  <h3 className="text-lg sm:text-xl font-bold text-blue-800 mr-2">
                    {t(`themes.${themeKey}`, { defaultValue: formatThemeName(themeKey) })}
                  </h3>
                  <span className="text-gray-700 text-base font-medium">{expandedThemes.has(themeKey) ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedThemes.has(themeKey) && (
                <div className="bg-white border border-gray-200 rounded-b-lg px-6 py-4">
                  {Object.entries(theme.codes).map(([codeKey, code]) => (
                    <div key={codeKey} className="p-3 sm:p-4 border-b last:border-b-0">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 mb-3">
                        <span className="px-2 py-1 text-xs font-mono bg-indigo-100 text-indigo-800 rounded self-start">
                          {codeKey}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed mb-3">
                        {code.summary}
                      </p>
                      {code.questions && code.questions.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                            {t('reflectionQuestions')}
                          </h4>
                          <div className="space-y-2">
                            {code.questions.map((question: string, idx: number) => (
                              <div key={idx} className="text-xs text-gray-600 pl-3 border-l-2 border-indigo-200 bg-white p-2 rounded-r">
                                {question}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
          )}
        </div>
    </main>
  );
}
