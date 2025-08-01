import { getStandardLocale, formatDateWithLocale, formatTimeWithLocale } from '../locale';

describe('locale utilities', () => {
  describe('getStandardLocale', () => {
    it('converts i18n language codes to standard locales', () => {
      expect(getStandardLocale('zhTW')).toBe('zh-TW');
      expect(getStandardLocale('zhCN')).toBe('zh-CN');
      expect(getStandardLocale('en')).toBe('en-US');
      expect(getStandardLocale('es')).toBe('es-ES');
      expect(getStandardLocale('fr')).toBe('fr-FR');
      expect(getStandardLocale('de')).toBe('de-DE');
      expect(getStandardLocale('it')).toBe('it-IT');
      expect(getStandardLocale('ja')).toBe('ja-JP');
      expect(getStandardLocale('ko')).toBe('ko-KR');
      expect(getStandardLocale('pt')).toBe('pt-BR');
      expect(getStandardLocale('ru')).toBe('ru-RU');
      expect(getStandardLocale('ar')).toBe('ar-SA');
      expect(getStandardLocale('th')).toBe('th-TH');
      expect(getStandardLocale('id')).toBe('id-ID');
    });

    it('returns original language for unknown codes', () => {
      expect(getStandardLocale('unknown')).toBe('unknown');
      expect(getStandardLocale('xyz')).toBe('xyz');
      expect(getStandardLocale('')).toBe('');
    });
  });

  describe('formatDateWithLocale', () => {
    const testDate = new Date('2024-01-15T14:30:00');
    const testDateString = '2024-01-15T14:30:00';

    // Mock toLocaleDateString to avoid locale-specific issues in tests
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('January 15, 2024 at 2:30 PM');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('formats date with default options', () => {
      const result = formatDateWithLocale(testDate, 'en');
      
      expect(Date.prototype.toLocaleDateString).toHaveBeenCalledWith(
        'en-US',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }
      );
      expect(result).toBe('January 15, 2024 at 2:30 PM');
    });

    it('formats date string with default options', () => {
      const result = formatDateWithLocale(testDateString, 'en');
      
      expect(Date.prototype.toLocaleDateString).toHaveBeenCalledWith(
        'en-US',
        expect.any(Object)
      );
      expect(result).toBe('January 15, 2024 at 2:30 PM');
    });

    it('uses custom options when provided', () => {
      const customOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };
      
      formatDateWithLocale(testDate, 'en', customOptions);
      
      expect(Date.prototype.toLocaleDateString).toHaveBeenCalledWith(
        'en-US',
        customOptions
      );
    });

    it('uses correct locale for different languages', () => {
      formatDateWithLocale(testDate, 'zhTW');
      expect(Date.prototype.toLocaleDateString).toHaveBeenCalledWith('zh-TW', expect.any(Object));
      
      formatDateWithLocale(testDate, 'ja');
      expect(Date.prototype.toLocaleDateString).toHaveBeenCalledWith('ja-JP', expect.any(Object));
      
      formatDateWithLocale(testDate, 'ko');
      expect(Date.prototype.toLocaleDateString).toHaveBeenCalledWith('ko-KR', expect.any(Object));
    });
  });

  describe('formatTimeWithLocale', () => {
    const testDate = new Date('2024-01-15T14:30:45');
    const testDateString = '2024-01-15T14:30:45';

    // Mock toLocaleTimeString to avoid locale-specific issues in tests
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('2:30 PM');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('formats time with default options', () => {
      const result = formatTimeWithLocale(testDate, 'en');
      
      expect(Date.prototype.toLocaleTimeString).toHaveBeenCalledWith(
        'en-US',
        {
          hour: '2-digit',
          minute: '2-digit'
        }
      );
      expect(result).toBe('2:30 PM');
    });

    it('formats time string with default options', () => {
      const result = formatTimeWithLocale(testDateString, 'en');
      
      expect(Date.prototype.toLocaleTimeString).toHaveBeenCalledWith(
        'en-US',
        expect.any(Object)
      );
      expect(result).toBe('2:30 PM');
    });

    it('uses custom options when provided', () => {
      const customOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      };
      
      formatTimeWithLocale(testDate, 'en', customOptions);
      
      expect(Date.prototype.toLocaleTimeString).toHaveBeenCalledWith(
        'en-US',
        customOptions
      );
    });

    it('uses correct locale for different languages', () => {
      formatTimeWithLocale(testDate, 'de');
      expect(Date.prototype.toLocaleTimeString).toHaveBeenCalledWith('de-DE', expect.any(Object));
      
      formatTimeWithLocale(testDate, 'fr');
      expect(Date.prototype.toLocaleTimeString).toHaveBeenCalledWith('fr-FR', expect.any(Object));
      
      formatTimeWithLocale(testDate, 'pt');
      expect(Date.prototype.toLocaleTimeString).toHaveBeenCalledWith('pt-BR', expect.any(Object));
    });
  });
});
