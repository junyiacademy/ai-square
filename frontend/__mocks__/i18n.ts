// Mock i18n module for tests
const i18n = {
  use: jest.fn().mockReturnThis(),
  init: jest.fn().mockReturnThis(),
  t: jest.fn((key: string) => key),
  changeLanguage: jest.fn(),
  language: 'en',
};

export default i18n;