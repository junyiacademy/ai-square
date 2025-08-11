export const TTL = {
  STATIC_24H: 24 * 60 * 60 * 1000,
  SEMI_STATIC_1H: 60 * 60 * 1000,
  DYNAMIC_5M: 5 * 60 * 1000,
} as const;

export const cacheKeys = {
  scenarioById: (id: string) => `scenario:byId:${id}`,
  scenariosBySource: (sourceType: string, sourceId?: string) =>
    sourceId ? `scenario:bySource:${sourceType}:${sourceId}` : `scenario:bySource:${sourceType}`,

  // New: relations data keyed by language
  relationsByLang: (lang: string) => `relations:${lang}`,

  // New: discovery scenarios list (language-scoped, anon only)
  discoveryScenarios: (lang: string) => `discovery:scenarios:list:${lang}`,
}; 