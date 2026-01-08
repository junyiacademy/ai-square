import React from "react";
import { render, screen } from "@testing-library/react";
import { LoadingSpinner } from "../loading-spinner";

describe("LoadingSpinner", () => {
  it("should render spinner with status role", () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole("status");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute("aria-label", "載入中");
  });

  it("should have screen reader only text", () => {
    render(<LoadingSpinner />);
    expect(screen.getByText("載入中...")).toHaveClass("sr-only");
  });

  it("should apply default size classes", () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole("status");
    expect(spinner.className).toContain("h-8");
    expect(spinner.className).toContain("w-8");
  });

  it("should apply size classes correctly", () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    let spinner = screen.getByRole("status");
    expect(spinner.className).toContain("h-4");
    expect(spinner.className).toContain("w-4");

    rerender(<LoadingSpinner size="md" />);
    spinner = screen.getByRole("status");
    expect(spinner.className).toContain("h-8");
    expect(spinner.className).toContain("w-8");

    rerender(<LoadingSpinner size="lg" />);
    spinner = screen.getByRole("status");
    expect(spinner.className).toContain("h-12");
    expect(spinner.className).toContain("w-12");
  });

  it("should apply animation classes", () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole("status");
    expect(spinner.className).toContain("animate-spin");
    expect(spinner.className).toContain("rounded-full");
    expect(spinner.className).toContain("border-b-2");
    expect(spinner.className).toContain("border-blue-600");
  });

  it("should apply custom className to wrapper", () => {
    const { container } = render(<LoadingSpinner className="custom-wrapper" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("custom-wrapper");
    expect(wrapper.className).toContain("flex");
    expect(wrapper.className).toContain("items-center");
    expect(wrapper.className).toContain("justify-center");
  });

  it("should center the spinner", () => {
    const { container } = render(<LoadingSpinner />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("flex");
    expect(wrapper.className).toContain("items-center");
    expect(wrapper.className).toContain("justify-center");
  });

  it("should render with all size variations", () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    expect(screen.getByRole("status")).toBeInTheDocument();

    rerender(<LoadingSpinner size="md" />);
    expect(screen.getByRole("status")).toBeInTheDocument();

    rerender(<LoadingSpinner size="lg" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("should maintain accessibility attributes", () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole("status");
    expect(spinner).toHaveAttribute("role", "status");
    expect(spinner).toHaveAttribute("aria-label", "載入中");
  });

  it("should combine custom className with default classes", () => {
    const { container } = render(<LoadingSpinner className="mt-4 mb-4" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("mt-4");
    expect(wrapper.className).toContain("mb-4");
    expect(wrapper.className).toContain("flex");
    expect(wrapper.className).toContain("items-center");
    expect(wrapper.className).toContain("justify-center");
  });
});
