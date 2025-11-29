/**
 * Draft manager hook for handling draft state and publish workflow
 */

import { useState, useCallback } from 'react';
import { useAutoSave } from './useAutoSave';

interface DraftState<T> {
  original: T | null;
  draft: T | null;
  hasChanges: boolean;
  lastSaved: Date | null;
}

interface UseDraftManagerOptions<T> {
  scenarioId: string;
  onPublish?: (data: T) => Promise<void>;
  autoSaveDelay?: number;
}

export function useDraftManager<T extends Record<string, unknown>>({
  scenarioId,
  onPublish,
  autoSaveDelay = 2000
}: UseDraftManagerOptions<T>) {
  const [state, setState] = useState<DraftState<T>>({
    original: null,
    draft: null,
    hasChanges: false,
    lastSaved: null
  });

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const draftKey = `draft-scenario-${scenarioId}`;

  // Auto-save hook
  const { loadSaved, clearSaved } = useAutoSave({
    key: draftKey,
    data: state.draft,
    delay: autoSaveDelay,
    enabled: state.hasChanges,
    onSave: () => {
      setState(prev => ({ ...prev, lastSaved: new Date() }));
    }
  });

  // Load original data
  const loadOriginal = useCallback((data: T) => {
    const saved = loadSaved();

    setState({
      original: data,
      draft: saved || data,
      hasChanges: saved !== null,
      lastSaved: saved ? new Date() : null
    });
  }, [loadSaved]);

  // Update draft
  const updateDraft = useCallback((updates: Partial<T> | ((prev: T) => T)) => {
    setState(prev => {
      if (!prev.draft) return prev;

      const newDraft = typeof updates === 'function'
        ? updates(prev.draft)
        : { ...prev.draft, ...updates };

      const hasChanges = JSON.stringify(newDraft) !== JSON.stringify(prev.original);

      return {
        ...prev,
        draft: newDraft,
        hasChanges
      };
    });
  }, []);

  // Publish changes
  const publish = useCallback(async () => {
    if (!state.draft || !onPublish) return;

    setIsPublishing(true);
    setPublishError(null);

    try {
      await onPublish(state.draft);

      // Update original to match draft
      setState(prev => ({
        ...prev,
        original: prev.draft,
        hasChanges: false
      }));

      // Clear saved draft
      clearSaved();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to publish';
      setPublishError(errorMessage);
      throw error;
    } finally {
      setIsPublishing(false);
    }
  }, [state.draft, onPublish, clearSaved]);

  // Discard changes
  const discardChanges = useCallback(() => {
    if (!state.original) return;

    setState(prev => ({
      ...prev,
      draft: prev.original,
      hasChanges: false,
      lastSaved: null
    }));

    clearSaved();
  }, [state.original, clearSaved]);

  // Get change summary
  const getChangeSummary = useCallback((): string[] => {
    if (!state.original || !state.draft) return [];

    const changes: string[] = [];
    const original = state.original;
    const draft = state.draft;

    // Deep comparison to find changes
    const compareObjects = (obj1: Record<string, unknown>, obj2: Record<string, unknown>, path = ''): void => {
      const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

      allKeys.forEach(key => {
        const val1 = obj1[key];
        const val2 = obj2[key];
        const currentPath = path ? `${path}.${key}` : key;

        if (JSON.stringify(val1) !== JSON.stringify(val2)) {
          changes.push(currentPath);
        }
      });
    };

    compareObjects(original, draft);

    return changes;
  }, [state.original, state.draft]);

  return {
    original: state.original,
    draft: state.draft,
    hasChanges: state.hasChanges,
    lastSaved: state.lastSaved,
    isPublishing,
    publishError,
    loadOriginal,
    updateDraft,
    publish,
    discardChanges,
    getChangeSummary
  };
}
