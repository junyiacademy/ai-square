import React from "react";
import { render } from "@testing-library/react";
import { LoadingSpinner } from "./loading-spinner";

describe("LoadingSpinner", () => {
  it("renders spinner element", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("applies default medium size classes", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toHaveClass("h-8", "w-8");
  });

  it("applies small size classes", () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toHaveClass("h-4", "w-4");
  });

  it("applies large size classes", () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toHaveClass("h-12", "w-12");
  });

  it("applies custom className to wrapper", () => {
    const { container } = render(<LoadingSpinner className="custom-spinner" />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass(
      "custom-spinner",
      "flex",
      "items-center",
      "justify-center",
    );
  });

  it("has proper accessibility attributes", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute("aria-label", "載入中");
  });

  it("applies border styling", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toHaveClass(
      "rounded-full",
      "border-b-2",
      "border-blue-600",
    );
  });
});
