/**
 * Tests for i18n.ts
 */

import i18n from '../i18n';

describe('i18n', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(i18n).toBeDefined();
  });

  it('should have required properties', () => {
    expect(i18n.language).toBe('en');
    expect(i18n.languages).toEqual(['en', 'zhTW', 'zhCN']);
    expect(typeof i18n.t).toBe('function');
    expect(typeof i18n.changeLanguage).toBe('function');
  });

  it('should translate keys', () => {
    const translated = i18n.t('test.key');
    expect(translated).toBe('test.key');
  });

  it('should handle language change', async () => {
    await i18n.changeLanguage('zh');
    expect(i18n.changeLanguage).toHaveBeenCalled();
  });
});