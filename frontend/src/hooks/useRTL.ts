import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Hook to handle RTL (Right-to-Left) languages
 * Currently supports Arabic (ar)
 */
export function useRTL() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const isRTL = i18n.language === 'ar';

    // Update document direction
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';

    // Add/remove RTL class for additional styling
    if (isRTL) {
      document.documentElement.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
    }

    return () => {
      // Cleanup on unmount
      document.documentElement.dir = 'ltr';
      document.documentElement.classList.remove('rtl');
    };
  }, [i18n.language]);

  return i18n.language === 'ar';
}
