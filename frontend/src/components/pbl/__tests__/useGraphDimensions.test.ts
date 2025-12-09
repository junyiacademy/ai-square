/**
 * Tests for useGraphDimensions hook
 * TDD Phase 1.4.2: Extract responsive sizing hook
 */

import { renderHook, act } from '@testing-library/react';
import { useGraphDimensions } from '../useGraphDimensions';

// Mock container element
const createMockContainer = (width: number) => ({
  getBoundingClientRect: jest.fn(() => ({
    width,
    height: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    x: 0,
    y: 0,
    toJSON: jest.fn()
  }))
});

describe('useGraphDimensions', () => {
  beforeEach(() => {
    // Reset window event listeners
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  it('should return default dimensions when container is null', () => {
    const { result } = renderHook(() => useGraphDimensions({ current: null }));

    expect(result.current.width).toBe(800);
    expect(result.current.height).toBe(600);
  });

  it('should calculate dimensions based on container width', () => {
    const mockContainer = createMockContainer(1000);
    const { result } = renderHook(() =>
      useGraphDimensions({ current: mockContainer as unknown as HTMLDivElement })
    );

    // width = container width - padding (48)
    expect(result.current.width).toBe(1000 - 48);
    // height = min(600, width * 0.75)
    expect(result.current.height).toBe(600);
  });

  it('should maintain aspect ratio for smaller containers', () => {
    const mockContainer = createMockContainer(400);
    const { result } = renderHook(() =>
      useGraphDimensions({ current: mockContainer as unknown as HTMLDivElement })
    );

    const expectedWidth = 400 - 48; // 352
    const expectedHeight = Math.min(600, expectedWidth * 0.75); // 264

    expect(result.current.width).toBe(expectedWidth);
    expect(result.current.height).toBe(expectedHeight);
  });

  it('should cap height at 600px', () => {
    const mockContainer = createMockContainer(1200);
    const { result } = renderHook(() =>
      useGraphDimensions({ current: mockContainer as unknown as HTMLDivElement })
    );

    expect(result.current.width).toBe(1200 - 48);
    expect(result.current.height).toBe(600); // Capped at 600
  });

  it('should register resize event listener on mount', () => {
    const mockContainer = createMockContainer(800);
    renderHook(() =>
      useGraphDimensions({ current: mockContainer as unknown as HTMLDivElement })
    );

    expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('should cleanup resize listener on unmount', () => {
    const mockContainer = createMockContainer(800);
    const { unmount } = renderHook(() =>
      useGraphDimensions({ current: mockContainer as unknown as HTMLDivElement })
    );

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('should update dimensions on resize', () => {
    let containerWidth = 800;
    const mockContainer = {
      getBoundingClientRect: jest.fn(() => ({
        width: containerWidth,
        height: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        x: 0,
        y: 0,
        toJSON: jest.fn()
      }))
    };

    const { result } = renderHook(() =>
      useGraphDimensions({ current: mockContainer as unknown as HTMLDivElement })
    );

    // Initial dimensions
    expect(result.current.width).toBe(800 - 48);

    // Simulate resize
    act(() => {
      containerWidth = 1000;
      // Trigger the resize event
      const resizeHandler = (window.addEventListener as jest.Mock).mock.calls.find(
        call => call[0] === 'resize'
      )?.[1];
      if (resizeHandler) resizeHandler();
    });

    expect(result.current.width).toBe(1000 - 48);
  });

  it('should subtract padding from container width', () => {
    const mockContainer = createMockContainer(896); // 896 - 48 = 848
    const { result } = renderHook(() =>
      useGraphDimensions({ current: mockContainer as unknown as HTMLDivElement })
    );

    expect(result.current.width).toBe(848);
  });

  it('should use aspect ratio of 0.75 for height calculation', () => {
    const mockContainer = createMockContainer(400);
    const { result } = renderHook(() =>
      useGraphDimensions({ current: mockContainer as unknown as HTMLDivElement })
    );

    const width = 400 - 48; // 352
    const expectedHeight = Math.min(600, width * 0.75); // min(600, 264) = 264

    expect(result.current.height).toBe(expectedHeight);
  });
});
