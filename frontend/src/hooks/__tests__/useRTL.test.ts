import { renderHook } from '@testing-library/react';
import { useRTL } from '../useRTL';
import { useTranslation } from 'react-i18next';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

const mockUseTranslation = useTranslation as jest.Mock;

describe('useRTL', () => {
  const originalDocumentDir = document.documentElement.dir;
  const originalClassList = document.documentElement.classList.value;

  beforeEach(() => {
    // Reset document state
    document.documentElement.dir = 'ltr';
    document.documentElement.classList.value = '';
  });

  afterEach(() => {
    // Restore original state
    document.documentElement.dir = originalDocumentDir;
    document.documentElement.classList.value = originalClassList;
    jest.clearAllMocks();
  });

  it('sets RTL direction for Arabic language', () => {
    mockUseTranslation.mockReturnValue({
      i18n: { language: 'ar' },
    });

    const { result } = renderHook(() => useRTL());

    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.classList.contains('rtl')).toBe(true);
    expect(result.current).toBe(true);
  });

  it('sets LTR direction for non-Arabic languages', () => {
    mockUseTranslation.mockReturnValue({
      i18n: { language: 'en' },
    });

    const { result } = renderHook(() => useRTL());

    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.classList.contains('rtl')).toBe(false);
    expect(result.current).toBe(false);
  });

  it('updates direction when language changes', () => {
    const { rerender } = renderHook(
      ({ language }) => {
        mockUseTranslation.mockReturnValue({
          i18n: { language },
        });
        return useRTL();
      },
      { initialProps: { language: 'en' } }
    );

    // Initially LTR
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.classList.contains('rtl')).toBe(false);

    // Change to Arabic
    rerender({ language: 'ar' });
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.classList.contains('rtl')).toBe(true);

    // Change back to English
    rerender({ language: 'en' });
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.classList.contains('rtl')).toBe(false);
  });

  it('cleans up on unmount', () => {
    mockUseTranslation.mockReturnValue({
      i18n: { language: 'ar' },
    });

    const { unmount } = renderHook(() => useRTL());

    // RTL is set
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.classList.contains('rtl')).toBe(true);

    // Unmount and check cleanup
    unmount();
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.classList.contains('rtl')).toBe(false);
  });

  it('handles multiple language switches correctly', () => {
    const languages = ['en', 'ar', 'fr', 'ar', 'de', 'ar', 'en'];
    
    languages.forEach(language => {
      mockUseTranslation.mockReturnValue({
        i18n: { language },
      });

      const { unmount } = renderHook(() => useRTL());

      const expectedDir = language === 'ar' ? 'rtl' : 'ltr';
      expect(document.documentElement.dir).toBe(expectedDir);
      expect(document.documentElement.classList.contains('rtl')).toBe(language === 'ar');

      unmount();
    });
  });
});
