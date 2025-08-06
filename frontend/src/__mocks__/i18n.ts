// Mock for i18n
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
};

export default i18n;