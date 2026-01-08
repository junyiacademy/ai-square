import React from "react";
import { render, screen } from "@testing-library/react";
import { Badge } from "../badge";

describe("Badge", () => {
  it("should render badge with text", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("should apply default variant classes", () => {
    render(<Badge data-testid="badge">Default</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("bg-blue-600");
    expect(badge.className).toContain("text-white");
    expect(badge.className).toContain("border-transparent");
  });

  it("should apply variant classes correctly", () => {
    const { rerender } = render(
      <Badge variant="default" data-testid="badge">
        Default
      </Badge>,
    );
    let badge = screen.getByTestId("badge");
    expect(badge.className).toContain("bg-blue-600");
    expect(badge.className).toContain("text-white");

    rerender(
      <Badge variant="secondary" data-testid="badge">
        Secondary
      </Badge>,
    );
    badge = screen.getByTestId("badge");
    expect(badge.className).toContain("bg-gray-200");
    expect(badge.className).toContain("text-gray-900");

    rerender(
      <Badge variant="destructive" data-testid="badge">
        Destructive
      </Badge>,
    );
    badge = screen.getByTestId("badge");
    expect(badge.className).toContain("bg-red-600");
    expect(badge.className).toContain("text-white");

    rerender(
      <Badge variant="outline" data-testid="badge">
        Outline
      </Badge>,
    );
    badge = screen.getByTestId("badge");
    expect(badge.className).toContain("text-gray-900");
  });

  it("should apply base classes", () => {
    render(<Badge data-testid="badge">Badge</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("inline-flex");
    expect(badge.className).toContain("items-center");
    expect(badge.className).toContain("rounded-full");
    expect(badge.className).toContain("border");
    expect(badge.className).toContain("px-2.5");
    expect(badge.className).toContain("py-0.5");
    expect(badge.className).toContain("text-xs");
    expect(badge.className).toContain("font-semibold");
  });

  it("should apply custom className", () => {
    render(
      <Badge className="custom-badge" data-testid="badge">
        Custom
      </Badge>,
    );
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("custom-badge");
  });

  it("should forward ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Badge ref={ref}>Badge</Badge>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("should pass through other props", () => {
    render(
      <Badge
        id="test-badge"
        role="status"
        aria-label="Status badge"
        data-testid="badge"
      >
        Status
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    expect(badge).toHaveAttribute("id", "test-badge");
    expect(badge).toHaveAttribute("role", "status");
    expect(badge).toHaveAttribute("aria-label", "Status badge");
  });

  it("should apply focus styles", () => {
    render(<Badge data-testid="badge">Focusable</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("focus:outline-none");
    expect(badge.className).toContain("focus:ring-2");
    expect(badge.className).toContain("focus:ring-gray-950");
    expect(badge.className).toContain("focus:ring-offset-2");
  });

  it("should apply transition classes", () => {
    render(<Badge data-testid="badge">Animated</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("transition-colors");
  });

  it("should render with children elements", () => {
    render(
      <Badge>
        <span>Icon</span>
        <span>Text</span>
      </Badge>,
    );
    expect(screen.getByText("Icon")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
  });
});
