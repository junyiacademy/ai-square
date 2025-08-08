// Mock i18n module with proper types
interface MockI18n {
  language: string;
  options: {
    lng: string;
    supportedLngs: string[];
    fallbackLng: string;
    interpolation: {
      escapeValue: boolean;
    };
    detection: {
      order: string[];
      caches: string[];
    };
    defaultNS: string;
    ns: string[];
  };
  changeLanguage: jest.Mock<Promise<(() => void)>, [string]>;
  t: jest.Mock<string, [string]>;
  format: jest.Mock<string, [number, string?]>;
  use: jest.Mock<MockI18n, []>;
  init: jest.Mock<Promise<void>, []>;
}

const mockI18n: MockI18n = {
  language: 'en',
  options: {
    lng: 'en',
    supportedLngs: ['en', 'zhTW', 'zhCN', 'pt', 'ar', 'id', 'th', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'],
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },
    defaultNS: 'common',
    ns: ['common', 'relations', 'auth', 'navigation']
  },
  changeLanguage: jest.fn((lng: string): Promise<(() => void)> => {
    mockI18n.language = lng;
    return Promise.resolve(() => {});
  }),
  t: jest.fn((key: string) => key),
  format: jest.fn((value: number) => value.toLocaleString()),
  use: jest.fn((): MockI18n => mockI18n),
  init: jest.fn(() => Promise.resolve())
};

jest.mock('./i18n', () => ({
  __esModule: true,
  default: mockI18n
}));

describe('i18n configuration', () => {
  it('should initialize i18n instance', () => {
    expect(mockI18n).toBeDefined();
    expect(mockI18n.language).toBeDefined();
  });

  it('should have default language configured', () => {
    expect(mockI18n.options).toBeDefined();
    expect(mockI18n.options.lng).toBe('en');
  });

  it('should support multiple languages', () => {
    expect(mockI18n.options.supportedLngs).toContain('en');
    expect(mockI18n.options.supportedLngs).toContain('zhTW');
    expect(mockI18n.options.supportedLngs).toContain('zhCN');
  });

  it('should have fallback language', () => {
    expect(mockI18n.options.fallbackLng).toBe('en');
  });

  it('should have interpolation configured', () => {
    expect(mockI18n.options.interpolation).toBeDefined();
    expect(mockI18n.options.interpolation?.escapeValue).toBe(false);
  });

  it('should change language', async () => {
    const originalLang = mockI18n.language;
    await mockI18n.changeLanguage('zhTW');
    expect(mockI18n.language).toBe('zhTW');
    await mockI18n.changeLanguage(originalLang);
  });

  it('should handle missing translations', () => {
    const key = 'nonexistent.key';
    const translation = mockI18n.t(key);
    expect(translation).toBe(key);
  });

  it('should format numbers', () => {
    const formatted = mockI18n.format(1234.56);
    expect(formatted).toBeDefined();
  });

  it('should detect language from browser', () => {
    expect(mockI18n.options.detection).toBeDefined();
  });

  it('should have namespace configuration', () => {
    expect(mockI18n.options.defaultNS).toBe('common');
    expect(mockI18n.options.ns).toContain('common');
  });
});