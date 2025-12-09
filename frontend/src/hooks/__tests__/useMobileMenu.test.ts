import { renderHook, act } from '@testing-library/react';
import { useMobileMenu } from '../useMobileMenu';

describe('useMobileMenu', () => {
  it('initializes with menu closed', () => {
    const { result } = renderHook(() => useMobileMenu());

    expect(result.current.isOpen).toBe(false);
  });

  it('opens menu when toggle is called', () => {
    const { result } = renderHook(() => useMobileMenu());

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('closes menu when toggle is called again', () => {
    const { result } = renderHook(() => useMobileMenu());

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('closes menu when close is called', () => {
    const { result } = renderHook(() => useMobileMenu());

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('close is idempotent', () => {
    const { result } = renderHook(() => useMobileMenu());

    act(() => {
      result.current.close();
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('toggle works multiple times', () => {
    const { result } = renderHook(() => useMobileMenu());

    // First toggle - open
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);

    // Second toggle - close
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);

    // Third toggle - open
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);
  });

  it('maintains state across re-renders', () => {
    const { result, rerender } = renderHook(() => useMobileMenu());

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(true);

    rerender();

    expect(result.current.isOpen).toBe(true);
  });
});
