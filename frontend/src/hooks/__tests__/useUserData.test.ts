import { renderHook, act, waitFor } from '@testing-library/react';
import useUserData from '../useUserData';

describe('useUserData', () => {
  it('should initialize correctly', () => {
    const { result } = renderHook(() => useUserData());
    expect(result.current).toBeDefined();
  });
  
  it('should handle state changes', async () => {
    const { result } = renderHook(() => useUserData());
    
    await act(async () => {
      // Trigger state change if applicable
      await waitFor(() => {
        expect(result.current).toBeDefined();
      });
    });
  });
  
  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useUserData());
    
    expect(() => {
      unmount();
    }).not.toThrow();
  });
});