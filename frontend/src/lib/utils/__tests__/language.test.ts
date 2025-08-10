import {
  LANGUAGE_NAMES,
  getLanguageFromHeader,
  isRTL,
  getLanguageDisplayName,
  isSupportedLanguage,
  getFallbackLanguage,
  normalizeLanguageCode
} from '../language';

describe('Language Utils', () => {
  describe('LANGUAGE_NAMES', () => {
    it('should contain all supported languages', () => {
      expect(LANGUAGE_NAMES).toHaveProperty('en');
      expect(LANGUAGE_NAMES).toHaveProperty('zhTW');
      expect(LANGUAGE_NAMES).toHaveProperty('zhCN');
      expect(LANGUAGE_NAMES).toHaveProperty('pt');
      expect(LANGUAGE_NAMES).toHaveProperty('ar');
      expect(LANGUAGE_NAMES).toHaveProperty('id');
      expect(LANGUAGE_NAMES).toHaveProperty('th');
      expect(LANGUAGE_NAMES).toHaveProperty('es');
      expect(LANGUAGE_NAMES).toHaveProperty('ja');
      expect(LANGUAGE_NAMES).toHaveProperty('ko');
      expect(LANGUAGE_NAMES).toHaveProperty('fr');
      expect(LANGUAGE_NAMES).toHaveProperty('de');
      expect(LANGUAGE_NAMES).toHaveProperty('ru');
      expect(LANGUAGE_NAMES).toHaveProperty('it');
    });

    it('should have 14 languages', () => {
      expect(Object.keys(LANGUAGE_NAMES)).toHaveLength(14);
    });
  });

  describe('getLanguageFromHeader', () => {
    it('should return English for missing header', () => {
      const request = new Request('http://test.com');
      expect(getLanguageFromHeader(request)).toBe('en');
    });

    it('should extract primary language from accept-language header', () => {
      const request = new Request('http://test.com', {
        headers: {
          'accept-language': 'en-US,en;q=0.9'
        }
      });
      expect(getLanguageFromHeader(request)).toBe('en');
    });

    it('should handle different language codes', () => {
      const request = new Request('http://test.com', {
        headers: {
          'accept-language': 'fr-FR,fr;q=0.9'
        }
      });
      expect(getLanguageFromHeader(request)).toBe('fr');
    });

    it('should return English for unsupported languages', () => {
      const request = new Request('http://test.com', {
        headers: {
          'accept-language': 'nl-NL,nl;q=0.9'
        }
      });
      expect(getLanguageFromHeader(request)).toBe('en');
    });

    it('should handle Chinese Traditional', () => {
      const request1 = new Request('http://test.com', {
        headers: {
          'accept-language': 'zh-TW'
        }
      });
      expect(getLanguageFromHeader(request1)).toBe('zhTW');

      const request2 = new Request('http://test.com', {
        headers: {
          'accept-language': 'zh-Hant'
        }
      });
      expect(getLanguageFromHeader(request2)).toBe('zhTW');
    });

    it('should handle Chinese Simplified', () => {
      const request1 = new Request('http://test.com', {
        headers: {
          'accept-language': 'zh-CN'
        }
      });
      expect(getLanguageFromHeader(request1)).toBe('zhCN');

      const request2 = new Request('http://test.com', {
        headers: {
          'accept-language': 'zh'
        }
      });
      expect(getLanguageFromHeader(request2)).toBe('zhCN');
    });

    it('should handle complex accept-language headers', () => {
      const request = new Request('http://test.com', {
        headers: {
          'accept-language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });
      expect(getLanguageFromHeader(request)).toBe('es');
    });
  });

  describe('isRTL', () => {
    it('should return true for Arabic', () => {
      expect(isRTL('ar')).toBe(true);
    });

    it('should return false for non-RTL languages', () => {
      expect(isRTL('en')).toBe(false);
      expect(isRTL('zhTW')).toBe(false);
      expect(isRTL('fr')).toBe(false);
      expect(isRTL('ja')).toBe(false);
    });
  });

  describe('getLanguageDisplayName', () => {
    it('should return display name for supported languages', () => {
      expect(getLanguageDisplayName('en')).toBe('English');
      expect(LANGUAGE_NAMES['zhTW']).toBeDefined();
      expect(LANGUAGE_NAMES['ar']).toBeDefined();
      expect(LANGUAGE_NAMES['ja']).toBeDefined();
    });

    it('should return language code for unsupported languages', () => {
      expect(getLanguageDisplayName('nl')).toBe('nl');
      expect(getLanguageDisplayName('unknown')).toBe('unknown');
    });
  });

  describe('isSupportedLanguage', () => {
    it('should return true for supported languages', () => {
      expect(isSupportedLanguage('en')).toBe(true);
      expect(isSupportedLanguage('zhTW')).toBe(true);
      expect(isSupportedLanguage('zhCN')).toBe(true);
      expect(isSupportedLanguage('pt')).toBe(true);
      expect(isSupportedLanguage('ar')).toBe(true);
      expect(isSupportedLanguage('id')).toBe(true);
      expect(isSupportedLanguage('th')).toBe(true);
      expect(isSupportedLanguage('es')).toBe(true);
      expect(isSupportedLanguage('ja')).toBe(true);
      expect(isSupportedLanguage('ko')).toBe(true);
      expect(isSupportedLanguage('fr')).toBe(true);
      expect(isSupportedLanguage('de')).toBe(true);
      expect(isSupportedLanguage('ru')).toBe(true);
      expect(isSupportedLanguage('it')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(isSupportedLanguage('nl')).toBe(false);
      expect(isSupportedLanguage('sv')).toBe(false);
      expect(isSupportedLanguage('unknown')).toBe(false);
    });
  });

  describe('getFallbackLanguage', () => {
    it('should return language if supported', () => {
      expect(getFallbackLanguage('en')).toBe('en');
      expect(getFallbackLanguage('fr')).toBe('fr');
      expect(getFallbackLanguage('ja')).toBe('ja');
    });

    it('should handle Chinese variants', () => {
      expect(getFallbackLanguage('zh-TW')).toBe('zhTW');
      expect(getFallbackLanguage('zh-tw')).toBe('zhTW');
      expect(getFallbackLanguage('zh-Hant')).toBe('zhTW');
      expect(getFallbackLanguage('zh-hant')).toBe('zhTW');
      
      expect(getFallbackLanguage('zh-CN')).toBe('zhCN');
      expect(getFallbackLanguage('zh-cn')).toBe('zhCN');
      expect(getFallbackLanguage('zh-Hans')).toBe('zhCN');
      expect(getFallbackLanguage('zh-hans')).toBe('zhCN');
      
      expect(getFallbackLanguage('zh')).toBe('zhCN');
    });

    it('should handle language-region codes', () => {
      expect(getFallbackLanguage('en-US')).toBe('en');
      expect(getFallbackLanguage('en-GB')).toBe('en');
      expect(getFallbackLanguage('fr-FR')).toBe('fr');
      expect(getFallbackLanguage('es-MX')).toBe('es');
      expect(getFallbackLanguage('pt-BR')).toBe('pt');
    });

    it('should return English for unsupported languages', () => {
      expect(getFallbackLanguage('nl')).toBe('en');
      expect(getFallbackLanguage('sv-SE')).toBe('en');
      expect(getFallbackLanguage('unknown')).toBe('en');
    });

    it('should handle case insensitive input', () => {
      expect(getFallbackLanguage('EN')).toBe('en');
      expect(getFallbackLanguage('FR')).toBe('fr');
      expect(getFallbackLanguage('ZH-TW')).toBe('zhTW');
    });
  });

  describe('normalizeLanguageCode', () => {
    it('should normalize language codes', () => {
      expect(normalizeLanguageCode('en')).toBe('en');
      expect(normalizeLanguageCode('en-US')).toBe('en');
      expect(normalizeLanguageCode('zh-TW')).toBe('zhTW');
      expect(normalizeLanguageCode('zh-CN')).toBe('zhCN');
      expect(normalizeLanguageCode('fr-FR')).toBe('fr');
    });

    it('should return English for unknown codes', () => {
      expect(normalizeLanguageCode('unknown')).toBe('en');
      expect(normalizeLanguageCode('nl')).toBe('en');
    });

    it('should be equivalent to getFallbackLanguage', () => {
      const testCases = ['en', 'fr', 'zh-TW', 'zh-CN', 'unknown', 'en-US'];
      testCases.forEach(code => {
        expect(normalizeLanguageCode(code)).toBe(getFallbackLanguage(code));
      });
    });
  });
});