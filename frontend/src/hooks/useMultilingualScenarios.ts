/**
 * Hook for managing multilingual scenarios
 * 支援語言切換而不需要重新載入資料
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface MultilingualScenario {
  id: string;
  translations: {
    [language: string]: {
      title: string;
      description: string;
      content?: any;
    };
  };
  userProgress?: any;
}

export function useMultilingualScenarios() {
  const [scenarios, setScenarios] = useState<MultilingualScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { i18n } = useTranslation();

  // 載入所有語言的 scenarios
  const loadScenarios = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/assessment/scenarios?allLanguages=true');
      const data = await response.json();
      
      if (data.success) {
        setScenarios(data.data.scenarios);
      } else {
        setError(data.error || 'Failed to load scenarios');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScenarios();
  }, []); // 只載入一次

  // 獲取當前語言的 scenarios
  const getCurrentLanguageScenarios = useCallback(() => {
    return scenarios.map(scenario => {
      const translation = scenario.translations?.[i18n.language] || 
                         scenario.translations?.en || 
                         { title: 'Untitled', description: '' };
      
      return {
        ...scenario,
        title: translation.title,
        description: translation.description,
        config: translation.content || {}
      };
    });
  }, [scenarios, i18n.language]);

  // 切換語言時不需要重新載入
  const localizedScenarios = getCurrentLanguageScenarios();

  return {
    scenarios: localizedScenarios,
    loading,
    error,
    refresh: loadScenarios
  };
}