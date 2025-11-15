import { renderHook, act } from '@testing-library/react';
import { useDiscoveryData } from '../useDiscoveryData';
import { useUserData } from '../useUserData';

// Mock useUserData hook
jest.mock('../useUserData');

describe('useDiscoveryData', () => {
  const mockUserData = {
    assessmentResults: {
      tech: 80,
      creative: 60,
      business: 70
    },
    achievements: {
      badges: ['badge1', 'badge2'],
      totalXp: 1500,
      level: 5,
      completedTasks: ['task1', 'task2']
    },
    assessmentSessions: [],
    lastUpdated: '2024-01-01T00:00:00.000Z',
    version: '2.0'
  };

  const mockLoadUserData = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useUserData as jest.Mock).mockReturnValue({
      userData: mockUserData,
      isLoading: false,
      error: null,
      loadUserData: mockLoadUserData
    });
  });

  it('should return user data correctly', () => {
    const { result } = renderHook(() => useDiscoveryData());

    expect(result.current.data).toEqual(mockUserData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should return assessment results', () => {
    const { result } = renderHook(() => useDiscoveryData());

    expect(result.current.assessmentResults).toEqual({
      tech: 80,
      creative: 60,
      business: 70
    });
  });

  it('should return achievements data', () => {
    const { result } = renderHook(() => useDiscoveryData());

    expect(result.current.achievements).toEqual({
      badges: ['badge1', 'badge2'],
      totalXp: 1500,
      level: 5,
      completedTasks: ['task1', 'task2']
    });
    expect(result.current.achievementCount).toBe(2);
  });

  it('should handle null user data', () => {
    (useUserData as jest.Mock).mockReturnValue({
      userData: null,
      isLoading: false,
      error: null,
      loadUserData: mockLoadUserData
    });

    const { result } = renderHook(() => useDiscoveryData());

    expect(result.current.data).toBeNull();
    expect(result.current.assessmentResults).toBeNull();
    expect(result.current.achievements).toEqual({
      badges: [],
      totalXp: 0,
      level: 1,
      completedTasks: []
    });
    expect(result.current.achievementCount).toBe(0);
  });

  it('should handle loading state', () => {
    (useUserData as jest.Mock).mockReturnValue({
      userData: null,
      isLoading: true,
      error: null,
      loadUserData: mockLoadUserData
    });

    const { result } = renderHook(() => useDiscoveryData());

    expect(result.current.isLoading).toBe(true);
  });

  it('should handle error state', () => {
    const errorMessage = 'Failed to load data';
    (useUserData as jest.Mock).mockReturnValue({
      userData: null,
      isLoading: false,
      error: errorMessage,
      loadUserData: mockLoadUserData
    });

    const { result } = renderHook(() => useDiscoveryData());

    expect(result.current.error).toEqual(new Error(errorMessage));
  });

  it('should refresh data', async () => {
    const { result } = renderHook(() => useDiscoveryData());

    await act(async () => {
      await result.current.refreshData();
    });

    expect(mockLoadUserData).toHaveBeenCalledTimes(1);
  });
});
