import { renderHook, waitFor, act } from '@testing-library/react';
import { useScenarioPrograms } from '../useScenarioPrograms';
import { authenticatedFetch } from '@/lib/utils/authenticated-fetch';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('@/lib/utils/authenticated-fetch');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

const mockAuthFetch = authenticatedFetch as jest.MockedFunction<typeof authenticatedFetch>;
const mockUseRouter = useRouter as jest.Mock;

describe('useScenarioPrograms', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush });
  });

  it('should fetch programs on mount', async () => {
    const mockPrograms = [
      {
        id: 'prog-1',
        status: 'active',
        currentTaskIndex: 0,
        metadata: { taskIds: ['task-1'], completedTaskCount: 0, totalTaskCount: 3 }
      }
    ];

    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { programs: mockPrograms } })
    } as Response);

    const { result } = renderHook(() => useScenarioPrograms('scenario-1'));

    await waitFor(() => {
      expect(result.current.programs).toHaveLength(1);
    });

    expect(result.current.programs[0].id).toBe('prog-1');
  });

  it('should handle start new program', async () => {
    mockAuthFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { programs: [] } })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'new-prog',
          tasks: [{ id: 'task-1' }]
        })
      } as Response);

    const { result } = renderHook(() => useScenarioPrograms('scenario-1'));

    await waitFor(() => {
      expect(result.current.programs).toHaveLength(0);
    });

    await act(async () => {
      await result.current.startProgram(undefined, 'en');
    });

    expect(mockPush).toHaveBeenCalledWith('/pbl/scenarios/scenario-1/programs/new-prog/tasks/task-1');
  });

  it('should handle continue existing program', async () => {
    const mockPrograms = [
      {
        id: 'prog-1',
        status: 'active',
        currentTaskIndex: 1,
        metadata: { taskIds: ['task-1', 'task-2', 'task-3'] }
      }
    ];

    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { programs: mockPrograms } })
    } as Response);

    const { result } = renderHook(() => useScenarioPrograms('scenario-1'));

    await waitFor(() => {
      expect(result.current.programs).toHaveLength(1);
    });

    await act(async () => {
      await result.current.startProgram('prog-1', 'en');
    });

    expect(mockPush).toHaveBeenCalledWith('/pbl/scenarios/scenario-1/programs/prog-1/tasks/task-2');
  });

  it('should handle errors when starting program', async () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

    mockAuthFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { programs: [] } })
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

    const { result } = renderHook(() => useScenarioPrograms('scenario-1'));

    await waitFor(() => {
      expect(result.current.programs).toHaveLength(0);
    });

    await act(async () => {
      await result.current.startProgram(undefined, 'en');
    });

    expect(alertSpy).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('should track loading state', async () => {
    mockAuthFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useScenarioPrograms('scenario-1'));

    expect(result.current.isStarting).toBe(false);

    act(() => {
      void result.current.startProgram(undefined, 'en');
    });

    expect(result.current.isStarting).toBe(true);
  });
});
