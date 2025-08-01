import { toBrowserLocale, fromBrowserLocale } from '../locale-mapping';

describe('locale-mapping', () => {
  describe('toBrowserLocale', () => {
    it('converts internal codes to browser-standard locales', () => {
      expect(toBrowserLocale('zhTW')).toBe('zh-TW');
      expect(toBrowserLocale('zhCN')).toBe('zh-CN');
      expect(toBrowserLocale('pt')).toBe('pt-BR');
      expect(toBrowserLocale('ar')).toBe('ar-SA');
      expect(toBrowserLocale('id')).toBe('id-ID');
      expect(toBrowserLocale('th')).toBe('th-TH');
    });

    it('keeps unchanged codes that do not need mapping', () => {
      expect(toBrowserLocale('en')).toBe('en');
      expect(toBrowserLocale('es')).toBe('es');
      expect(toBrowserLocale('ja')).toBe('ja');
      expect(toBrowserLocale('ko')).toBe('ko');
      expect(toBrowserLocale('fr')).toBe('fr');
      expect(toBrowserLocale('de')).toBe('de');
      expect(toBrowserLocale('ru')).toBe('ru');
      expect(toBrowserLocale('it')).toBe('it');
    });

    it('returns original code for unknown codes', () => {
      expect(toBrowserLocale('unknown')).toBe('unknown');
      expect(toBrowserLocale('xyz')).toBe('xyz');
      expect(toBrowserLocale('')).toBe('');
    });
  });

  describe('fromBrowserLocale', () => {
    it('converts browser-standard locales to internal codes', () => {
      expect(fromBrowserLocale('zh-TW')).toBe('zhTW');
      expect(fromBrowserLocale('zh-CN')).toBe('zhCN');
      expect(fromBrowserLocale('pt-BR')).toBe('pt');
      expect(fromBrowserLocale('ar-SA')).toBe('ar');
      expect(fromBrowserLocale('id-ID')).toBe('id');
      expect(fromBrowserLocale('th-TH')).toBe('th');
    });

    it('keeps unchanged codes that do not need mapping', () => {
      expect(fromBrowserLocale('en')).toBe('en');
      expect(fromBrowserLocale('es')).toBe('es');
      expect(fromBrowserLocale('ja')).toBe('ja');
      expect(fromBrowserLocale('ko')).toBe('ko');
      expect(fromBrowserLocale('fr')).toBe('fr');
      expect(fromBrowserLocale('de')).toBe('de');
      expect(fromBrowserLocale('ru')).toBe('ru');
      expect(fromBrowserLocale('it')).toBe('it');
    });

    it('returns original locale for unknown locales', () => {
      expect(fromBrowserLocale('unknown-UN')).toBe('unknown-UN');
      expect(fromBrowserLocale('xyz-XY')).toBe('xyz-XY');
      expect(fromBrowserLocale('')).toBe('');
    });
  });

  describe('round-trip conversion', () => {
    it('converts correctly in both directions', () => {
      const internalCodes = ['zhTW', 'zhCN', 'pt', 'ar', 'id', 'th', 'en', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];
      
      internalCodes.forEach(code => {
        const browserLocale = toBrowserLocale(code);
        const backToInternal = fromBrowserLocale(browserLocale);
        expect(backToInternal).toBe(code);
      });
    });

    it('handles browser locales round-trip', () => {
      const browserLocales = ['zh-TW', 'zh-CN', 'pt-BR', 'ar-SA', 'id-ID', 'th-TH', 'en', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];
      
      browserLocales.forEach(locale => {
        const internalCode = fromBrowserLocale(locale);
        const backToBrowser = toBrowserLocale(internalCode);
        expect(backToBrowser).toBe(locale);
      });
    });
  });
});
