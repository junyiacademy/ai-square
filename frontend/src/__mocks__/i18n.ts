// Mock for i18n with all required properties
const i18n = {
  use: jest.fn().mockReturnThis(),
  init: jest.fn().mockReturnThis(),
  changeLanguage: jest.fn(() => Promise.resolve()),
  language: 'en',
  languages: ['en', 'zhTW', 'zhCN'],
  t: (key: string) => key,
  exists: jest.fn(),
  getFixedT: jest.fn(),
  hasLoadedNamespace: jest.fn(),
  loadNamespaces: jest.fn(),
  loadLanguages: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  // Additional properties required by i18n interface
  loadResources: jest.fn(),
  modules: {},
  services: {
    logger: { log: jest.fn() },
    resourceStore: { data: {} },
    languageUtils: { getScriptPartFromCode: jest.fn() },
    pluralResolver: { getRule: jest.fn() },
    interpolator: { interpolate: jest.fn() },
    backendConnector: { backend: null },
    i18nFormat: { addLookupKeys: jest.fn() },
    formatter: { add: jest.fn() },
  } as any,
  store: {
    data: {},
    options: {}
  } as any,
  format: jest.fn(),
  options: {},
  isInitialized: true,
  logger: { log: jest.fn() } as any,
} as any;

export default i18n;