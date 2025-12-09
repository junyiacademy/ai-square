/**
 * Auto-save hook for draft management
 * Automatically saves content to localStorage with debouncing
 */

import { useEffect, useRef, useCallback } from 'react';

interface UseAutoSaveOptions<T> {
  key: string;
  data: T;
  delay?: number;
  onSave?: (data: T) => void;
  enabled?: boolean;
}

export function useAutoSave<T>({
  key,
  data,
  delay = 2000,
  onSave,
  enabled = true
}: UseAutoSaveOptions<T>) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  const save = useCallback((dataToSave: T) => {
    try {
      const serialized = JSON.stringify(dataToSave);

      // Skip if data hasn't changed
      if (serialized === lastSavedRef.current) {
        return;
      }

      localStorage.setItem(key, serialized);
      lastSavedRef.current = serialized;

      if (onSave) {
        onSave(dataToSave);
      }
    } catch (error) {
      console.error('Failed to auto-save:', error);
    }
  }, [key, onSave]);

  useEffect(() => {
    if (!enabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      save(data);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, save]);

  const loadSaved = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return null;

      const parsed = JSON.parse(saved) as T;
      lastSavedRef.current = saved;
      return parsed;
    } catch (error) {
      console.error('Failed to load saved data:', error);
      return null;
    }
  }, [key]);

  const clearSaved = useCallback(() => {
    try {
      localStorage.removeItem(key);
      lastSavedRef.current = '';
    } catch (error) {
      console.error('Failed to clear saved data:', error);
    }
  }, [key]);

  return {
    loadSaved,
    clearSaved,
    forceSave: () => save(data)
  };
}
