import { LANGUAGE_NAMES, getLanguageFromHeader, normalizeLanguageCode } from '../language';

describe('language utils', () => {
  describe('LANGUAGE_NAMES', () => {
    it('contains all 14 supported languages', () => {
      const expectedLanguages = [
        'en', 'zhTW', 'zhCN', 'pt', 'ar', 'id',
        'th', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'
      ];
      expectedLanguages.forEach(lang => {
        expect(LANGUAGE_NAMES).toHaveProperty(lang);
      });
    });

    it('has correct native names', () => {
      expect(LANGUAGE_NAMES.en).toBe('English');
      expect(LANGUAGE_NAMES.zhTW).toBe('繁體中文');
      expect(LANGUAGE_NAMES.zhCN).toBe('简体中文');
      expect(LANGUAGE_NAMES.ar).toBe('العربية');
      expect(LANGUAGE_NAMES.ja).toBe('日本語');
      expect(LANGUAGE_NAMES.ko).toBe('한국어');
    });
  });

  describe('getLanguageFromHeader', () => {
    it('returns English for missing header', () => {
      const request = new Request('http://localhost', {});
      expect(getLanguageFromHeader(request)).toBe('en');
    });

    it('extracts primary language from accept-language header', () => {
      const request = new Request('http://localhost', {
        headers: { 'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8' }
      });
      expect(getLanguageFromHeader(request)).toBe('fr');
    });

    it('handles Chinese variants correctly', () => {
      const requestTW = new Request('http://localhost', {
        headers: { 'accept-language': 'zh-TW,zh;q=0.9' }
      });
      expect(getLanguageFromHeader(requestTW)).toBe('zhTW');

      const requestCN = new Request('http://localhost', {
        headers: { 'accept-language': 'zh-CN,zh;q=0.9' }
      });
      expect(getLanguageFromHeader(requestCN)).toBe('zhCN');

      const requestHant = new Request('http://localhost', {
        headers: { 'accept-language': 'zh-Hant,zh;q=0.9' }
      });
      expect(getLanguageFromHeader(requestHant)).toBe('zhTW');
    });

    it('defaults zh to zhCN', () => {
      const request = new Request('http://localhost', {
        headers: { 'accept-language': 'zh,en;q=0.9' }
      });
      expect(getLanguageFromHeader(request)).toBe('zhCN');
    });

    it('returns en for unsupported languages', () => {
      const request = new Request('http://localhost', {
        headers: { 'accept-language': 'xx-XX,en;q=0.9' }
      });
      expect(getLanguageFromHeader(request)).toBe('en');
    });

    it('handles complex accept-language strings', () => {
      const request = new Request('http://localhost', {
        headers: { 'accept-language': 'es-MX,es;q=0.9,en-US;q=0.8,en;q=0.7' }
      });
      expect(getLanguageFromHeader(request)).toBe('es');
    });
  });

  describe('normalizeLanguageCode', () => {
    it('handles Chinese variants', () => {
      expect(normalizeLanguageCode('zh-TW')).toBe('zhTW');
      expect(normalizeLanguageCode('zh_TW')).toBe('zhTW');
      expect(normalizeLanguageCode('zh-CN')).toBe('zhCN');
      expect(normalizeLanguageCode('zh_CN')).toBe('zhCN');
      expect(normalizeLanguageCode('zh')).toBe('zhCN');
    });

    it('returns supported languages unchanged', () => {
      const supportedLangs = ['en', 'zhTW', 'zhCN', 'pt', 'ar', 'id', 'th', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];
      supportedLangs.forEach(lang => {
        expect(normalizeLanguageCode(lang)).toBe(lang);
      });
    });

    it('defaults to English for unknown codes', () => {
      expect(normalizeLanguageCode('xx')).toBe('en');
      expect(normalizeLanguageCode('unknown')).toBe('en');
      expect(normalizeLanguageCode('en-US')).toBe('en');
      expect(normalizeLanguageCode('fr-CA')).toBe('en');
    });

    it('is case sensitive', () => {
      // The function doesn't convert to lowercase, so capitals won't match
      expect(normalizeLanguageCode('EN')).toBe('en');
      expect(normalizeLanguageCode('ZH-TW')).toBe('en'); // Doesn't match the exact string
    });

    it('handles empty string', () => {
      expect(normalizeLanguageCode('')).toBe('en');
    });
  });
});
