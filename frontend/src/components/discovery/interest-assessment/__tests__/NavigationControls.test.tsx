import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { NavigationControls } from "../NavigationControls";

describe("NavigationControls", () => {
  const mockOnPrevious = jest.fn();
  const mockOnNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render navigation buttons", () => {
    render(
      <NavigationControls
        canGoPrevious={true}
        canGoNext={true}
        isAnimating={false}
        isLastQuestion={false}
        selectedCount={1}
        onPrevious={mockOnPrevious}
        onNext={mockOnNext}
      />,
    );

    expect(screen.getByText("上一題")).toBeInTheDocument();
    expect(screen.getByText("下一題")).toBeInTheDocument();
  });

  it("should show complete text on last question", () => {
    render(
      <NavigationControls
        canGoPrevious={true}
        canGoNext={true}
        isAnimating={false}
        isLastQuestion={true}
        selectedCount={1}
        onPrevious={mockOnPrevious}
        onNext={mockOnNext}
      />,
    );

    expect(screen.getByText("完成分析")).toBeInTheDocument();
  });

  it("should disable previous when not allowed", () => {
    render(
      <NavigationControls
        canGoPrevious={false}
        canGoNext={true}
        isAnimating={false}
        isLastQuestion={false}
        selectedCount={1}
        onPrevious={mockOnPrevious}
        onNext={mockOnNext}
      />,
    );

    const prevButton = screen.getByText("上一題").closest("button");
    expect(prevButton).toBeDisabled();
  });

  it("should disable next when not allowed", () => {
    render(
      <NavigationControls
        canGoPrevious={true}
        canGoNext={false}
        isAnimating={false}
        isLastQuestion={false}
        selectedCount={0}
        onPrevious={mockOnPrevious}
        onNext={mockOnNext}
      />,
    );

    const nextButton = screen.getByText("下一題").closest("button");
    expect(nextButton).toBeDisabled();
  });

  it("should call onPrevious when clicked", () => {
    render(
      <NavigationControls
        canGoPrevious={true}
        canGoNext={true}
        isAnimating={false}
        isLastQuestion={false}
        selectedCount={1}
        onPrevious={mockOnPrevious}
        onNext={mockOnNext}
      />,
    );

    fireEvent.click(screen.getByText("上一題"));
    expect(mockOnPrevious).toHaveBeenCalled();
  });

  it("should call onNext when clicked", () => {
    render(
      <NavigationControls
        canGoPrevious={true}
        canGoNext={true}
        isAnimating={false}
        isLastQuestion={false}
        selectedCount={1}
        onPrevious={mockOnPrevious}
        onNext={mockOnNext}
      />,
    );

    fireEvent.click(screen.getByText("下一題"));
    expect(mockOnNext).toHaveBeenCalled();
  });

  it("should show selected count", () => {
    render(
      <NavigationControls
        canGoPrevious={true}
        canGoNext={true}
        isAnimating={false}
        isLastQuestion={false}
        selectedCount={3}
        onPrevious={mockOnPrevious}
        onNext={mockOnNext}
      />,
    );

    expect(screen.getByText(/已選擇 3 個選項/)).toBeInTheDocument();
  });
});
