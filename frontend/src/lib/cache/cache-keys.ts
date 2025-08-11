export const TTL = {
  STATIC_24H: 24 * 60 * 60 * 1000,
  SEMI_STATIC_1H: 60 * 60 * 1000,
  DYNAMIC_5M: 5 * 60 * 1000,
} as const;

export const cacheKeys = {
  scenarioById: (id: string) => `scenario:byId:${id}`,
  scenariosBySource: (sourceType: string, sourceId?: string) =>
    sourceId ? `scenario:bySource:${sourceType}:${sourceId}` : `scenario:bySource:${sourceType}`,

  relationsByLang: (lang: string) => `relations:${lang}`,
  discoveryScenarios: (lang: string) => `discovery:scenarios:list:${lang}`,

  // New keys per request
  assessmentScenarios: (lang: string) => `assessment:scenarios:${lang}`,
  pblScenarios: (lang: string, source: string = 'unified') => `pbl:scenarios:${source}:${lang}`,
  ksaFramework: (lang: string) => `ksa:framework:${lang}`,
  discoveryCareer: (careerType: string) => `discovery:career:${careerType}`,
  publicStats: () => 'stats:public',
}; 