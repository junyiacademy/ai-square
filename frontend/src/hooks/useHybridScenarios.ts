/**
 * Hybrid Scenarios Hook
 * 英文從 GCS，其他語言從 YAML
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface Scenario {
  id: string;
  title: string;
  description: string;
  config: Record<string, unknown>;
  userProgress?: Record<string, unknown>;
}

interface CacheEntry {
  data: Scenario[];
  timestamp: number;
  language: string;
}

export function useHybridScenarios() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { i18n } = useTranslation();
  
  // 本地快取
  const cache = useRef<Map<string, CacheEntry>>(new Map());
  const CACHE_TTL = 5 * 60 * 1000; // 5 分鐘
  
  // 預載下一個可能的語言
  const preloadLanguages = useRef<Set<string>>(new Set());

  // 預載策略 - 定義在 loadScenarios 之前，避免循環依賴
  const preloadNextLanguages = useCallback((currentLang: string) => {
    // 預載常用語言組合
    const preloadMap: Record<string, string[]> = {
      'en': ['zhTW', 'zhCN'],
      'zhTW': ['en', 'zhCN'],
      'zhCN': ['en', 'zhTW'],
      'ja': ['en'],
      'ko': ['en']
    };
    
    const toPreload = preloadMap[currentLang] || ['en'];
    
    toPreload.forEach(lang => {
      if (!preloadLanguages.current.has(lang)) {
        preloadLanguages.current.add(lang);
        // 延遲預載，避免影響主要請求
        setTimeout(() => {
          loadScenarios(lang, true);
        }, 1000);
      }
    });
  }, [loadScenarios]); // 暫時空的依賴，之後會設定 loadScenarios

  const loadScenarios = useCallback(async (language: string, isPreload = false) => {
    // 檢查快取
    const cached = cache.current.get(language);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      if (!isPreload) {
        setScenarios(cached.data);
        setLoading(false);
      }
      return cached.data;
    }

    try {
      if (!isPreload) setLoading(true);
      
      const response = await fetch(`/api/assessment/scenarios?lang=${language}`);
      const data = await response.json();
      
      if (data.success) {
        const scenarioData = data.data.scenarios;
        
        // 更新快取
        cache.current.set(language, {
          data: scenarioData,
          timestamp: Date.now(),
          language
        });
        
        if (!isPreload) {
          setScenarios(scenarioData);
          
          // 預載其他常用語言
          preloadNextLanguages(language);
        }
        
        return scenarioData;
      } else {
        throw new Error(data.error || 'Failed to load scenarios');
      }
    } catch (err) {
      if (!isPreload) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
      return null;
    } finally {
      if (!isPreload) setLoading(false);
    }
  }, [CACHE_TTL, preloadNextLanguages]);

  // 語言變更時載入
  useEffect(() => {
    loadScenarios(i18n.language);
  }, [i18n.language, loadScenarios]);

  // 清理過期快取
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      cache.current.forEach((entry, key) => {
        if (now - entry.timestamp > CACHE_TTL) {
          cache.current.delete(key);
        }
      });
    }, 60000); // 每分鐘清理一次

    return () => clearInterval(cleanup);
  }, [CACHE_TTL]);

  return {
    scenarios,
    loading,
    error,
    refresh: () => loadScenarios(i18n.language),
    cacheStatus: {
      size: cache.current.size,
      languages: Array.from(cache.current.keys())
    }
  };
}