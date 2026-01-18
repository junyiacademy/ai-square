import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  it("renders children correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("handles click events", () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    fireEvent.click(screen.getByText("Click"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("can be disabled", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByText("Disabled").closest("button");
    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:opacity-50");
  });

  it("applies default variant classes", () => {
    render(<Button>Default</Button>);
    const button = screen.getByText("Default").closest("button");
    expect(button).toHaveClass("bg-[#0363A7]", "text-white");
  });

  it("applies destructive variant classes", () => {
    render(<Button variant="destructive">Destructive</Button>);
    const button = screen.getByText("Destructive").closest("button");
    expect(button).toHaveClass("bg-red-600", "text-white");
  });

  it("applies outline variant classes", () => {
    render(<Button variant="outline">Outline</Button>);
    const button = screen.getByText("Outline").closest("button");
    expect(button).toHaveClass("border", "border-gray-300", "bg-transparent");
  });

  it("applies secondary variant classes", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByText("Secondary").closest("button");
    expect(button).toHaveClass("bg-gray-200", "text-gray-900");
  });

  it("applies ghost variant classes", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByText("Ghost").closest("button");
    expect(button?.className).toContain("hover:bg-gray-100");
  });

  it("applies link variant classes", () => {
    render(<Button variant="link">Link</Button>);
    const button = screen.getByText("Link").closest("button");
    expect(button).toHaveClass("text-blue-600", "underline-offset-4");
  });

  it("applies default size classes", () => {
    render(<Button>Default Size</Button>);
    const button = screen.getByText("Default Size").closest("button");
    expect(button).toHaveClass("h-10", "px-4", "py-2");
  });

  it("applies small size classes", () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByText("Small").closest("button");
    expect(button).toHaveClass("h-9", "px-3");
  });

  it("applies large size classes", () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByText("Large").closest("button");
    expect(button).toHaveClass("h-11", "px-8");
  });

  it("applies icon size classes", () => {
    render(<Button size="icon">🎯</Button>);
    const button = screen.getByText("🎯").closest("button");
    expect(button).toHaveClass("h-10", "w-10");
  });

  it("combines custom className", () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByText("Custom").closest("button");
    expect(button).toHaveClass("custom-class");
  });

  it("forwards ref correctly", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("applies focus visible styles", () => {
    render(<Button>Focus</Button>);
    const button = screen.getByText("Focus").closest("button");
    expect(button?.className).toContain("focus-visible:outline-none");
    expect(button?.className).toContain("focus-visible:ring-2");
  });
});
