import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import DynamicPhraseCarousel from "../DynamicPhraseCarousel";
import "@testing-library/jest-dom";

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      animate,
      initial,
      transition,
      className,
      ...props
    }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children, mode }: any) => children,
}));

describe("DynamicPhraseCarousel", () => {
  const mockPhrases = [
    "Discover your potential",
    "Learn with AI guidance",
    "Transform your skills",
  ];

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("should render without crashing", () => {
    render(<DynamicPhraseCarousel phrases={mockPhrases} />);
    expect(screen.getByText("Discover your potential")).toBeInTheDocument();
  });

  it("should display first phrase initially", () => {
    render(<DynamicPhraseCarousel phrases={mockPhrases} />);
    expect(screen.getByText("Discover your potential")).toBeInTheDocument();
  });

  it("should cycle to second phrase after interval", async () => {
    render(<DynamicPhraseCarousel phrases={mockPhrases} />);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.getByText("Learn with AI guidance")).toBeInTheDocument();
    });
  });

  it("should cycle to third phrase", async () => {
    render(<DynamicPhraseCarousel phrases={mockPhrases} />);

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    await waitFor(() => {
      expect(screen.getByText("Transform your skills")).toBeInTheDocument();
    });
  });

  it("should cycle back to first phrase after last", async () => {
    render(<DynamicPhraseCarousel phrases={mockPhrases} />);

    act(() => {
      jest.advanceTimersByTime(9000);
    });

    await waitFor(() => {
      expect(screen.getByText("Discover your potential")).toBeInTheDocument();
    });
  });

  it("should handle single phrase without crashing", () => {
    render(<DynamicPhraseCarousel phrases={["Single phrase"]} />);
    expect(screen.getByText("Single phrase")).toBeInTheDocument();
  });

  it("should handle empty phrases array gracefully", () => {
    render(<DynamicPhraseCarousel phrases={[]} />);
    const container = screen.getByTestId("phrase-carousel");
    expect(container).toBeInTheDocument();
  });

  it("should clean up interval on unmount", () => {
    const { unmount } = render(<DynamicPhraseCarousel phrases={mockPhrases} />);

    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });

  it("should accept custom interval duration", () => {
    render(<DynamicPhraseCarousel phrases={mockPhrases} intervalMs={1000} />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.queryByText("Learn with AI guidance")).toBeInTheDocument();
  });

  it("should render with proper container classes", () => {
    const { container } = render(
      <DynamicPhraseCarousel phrases={mockPhrases} />,
    );
    const phraseContainer = container.firstChild;
    expect(phraseContainer).toHaveClass("mb-8");
  });

  it("should handle phrase updates dynamically", () => {
    const { rerender } = render(
      <DynamicPhraseCarousel phrases={mockPhrases} />,
    );

    const newPhrases = ["New phrase 1", "New phrase 2"];
    rerender(<DynamicPhraseCarousel phrases={newPhrases} />);

    expect(screen.getByText("New phrase 1")).toBeInTheDocument();
  });
});
