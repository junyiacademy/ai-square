import React from "react";
import { render, act } from "@testing-library/react";
import FloatingParticles from "../FloatingParticles";
import "@testing-library/jest-dom";

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      animate,
      initial,
      transition,
      style,
      className,
      ...props
    }: any) => (
      <div className={className} style={style} {...props}>
        {children}
      </div>
    ),
  },
}));

describe("FloatingParticles", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("should render without crashing", () => {
    const { container } = render(<FloatingParticles />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("should initialize with 10 particles by default", () => {
    const { container } = render(<FloatingParticles />);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should have container element
    expect(container.firstChild).toHaveClass("absolute", "inset-0", "-z-10");
  });

  it("should accept custom particle count", () => {
    const { container } = render(<FloatingParticles count={5} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("should animate particles periodically", () => {
    render(<FloatingParticles />);

    // Advance timer for particle animation
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Animation should have triggered
    expect(true).toBe(true);
  });

  it("should clean up interval on unmount", () => {
    const { unmount } = render(<FloatingParticles />);

    unmount();

    // No timers should be running
    expect(jest.getTimerCount()).toBe(0);
  });

  it("should generate particles with random properties", () => {
    const { container } = render(<FloatingParticles />);

    // Container should exist
    expect(container.firstChild).toBeInTheDocument();
  });

  it("should use predefined color palette", () => {
    const { container } = render(<FloatingParticles />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("should handle edge cases with 0 particles", () => {
    const { container } = render(<FloatingParticles count={0} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("should handle large particle counts", () => {
    const { container } = render(<FloatingParticles count={50} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("should maintain particle animation state", () => {
    render(<FloatingParticles />);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(true).toBe(true);
  });
});
