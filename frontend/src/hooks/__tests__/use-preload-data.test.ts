/**
 * Tests for usePreloadData.ts
 */

import { renderHook, waitFor } from '@testing-library/react';
import { usePreloadData } from '../use-preload-data';

// Mock dependencies
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      language: 'en'
    }
  })
}));

jest.mock('@/services/content-service', () => ({
  contentService: {
    preloadEssentialData: jest.fn()
  }
}));

describe('usePreloadData', () => {
  const mockContentService = require('@/services/content-service').contentService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(usePreloadData).toBeDefined();
  });

  it('should start with loading state', () => {
    const { result } = renderHook(() => usePreloadData());
    expect(result.current.isPreloading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should complete preloading successfully', async () => {
    mockContentService.preloadEssentialData.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePreloadData());

    await waitFor(() => {
      expect(result.current.isPreloading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(mockContentService.preloadEssentialData).toHaveBeenCalledWith('en');
  });

  it('should handle preload errors', async () => {
    const testError = new Error('Preload failed');
    mockContentService.preloadEssentialData.mockRejectedValue(testError);

    const { result } = renderHook(() => usePreloadData());

    await waitFor(() => {
      expect(result.current.isPreloading).toBe(false);
    });

    expect(result.current.error).toEqual(testError);
  });
});
