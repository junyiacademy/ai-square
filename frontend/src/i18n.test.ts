import i18n from './i18n';

describe('i18n configuration', () => {
  it('should initialize i18n instance', () => {
    expect(i18n).toBeDefined();
    expect(i18n.language).toBeDefined();
  });

  it('should have default language configured', () => {
    expect(i18n.options).toBeDefined();
    expect(i18n.options.lng).toBe('en');
  });

  it('should support multiple languages', () => {
    expect(i18n.options.supportedLngs).toContain('en');
    expect(i18n.options.supportedLngs).toContain('zhTW');
    expect(i18n.options.supportedLngs).toContain('zhCN');
  });

  it('should have fallback language', () => {
    expect(i18n.options.fallbackLng).toBe('en');
  });

  it('should have interpolation configured', () => {
    expect(i18n.options.interpolation).toBeDefined();
    expect(i18n.options.interpolation?.escapeValue).toBe(false);
  });

  it('should change language', async () => {
    const originalLang = i18n.language;
    await i18n.changeLanguage('zhTW');
    expect(i18n.language).toBe('zhTW');
    await i18n.changeLanguage(originalLang);
  });

  it('should handle missing translations', () => {
    const key = 'nonexistent.key';
    const translation = i18n.t(key);
    expect(translation).toBe(key);
  });

  it('should format numbers', () => {
    const formatted = i18n.format(1234.56, 'number');
    expect(formatted).toBeDefined();
  });

  it('should detect language from browser', () => {
    expect(i18n.options.detection).toBeDefined();
  });

  it('should have namespace configuration', () => {
    expect(i18n.options.defaultNS).toBe('common');
    expect(i18n.options.ns).toContain('common');
  });
});