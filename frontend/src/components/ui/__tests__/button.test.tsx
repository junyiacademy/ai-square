import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../button";

describe("Button", () => {
  it("should render button with text", () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole("button", { name: "Click me" }),
    ).toBeInTheDocument();
  });

  it("should handle click events", async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should be disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should apply variant classes", () => {
    const { rerender } = render(<Button variant="default">Default</Button>);
    let button = screen.getByRole("button");
    expect(button.className).toContain("bg-blue-600");

    rerender(<Button variant="destructive">Destructive</Button>);
    button = screen.getByRole("button");
    expect(button.className).toContain("bg-red-600");

    rerender(<Button variant="outline">Outline</Button>);
    button = screen.getByRole("button");
    expect(button.className).toContain("border");

    rerender(<Button variant="secondary">Secondary</Button>);
    button = screen.getByRole("button");
    expect(button.className).toContain("bg-gray-200");

    rerender(<Button variant="ghost">Ghost</Button>);
    button = screen.getByRole("button");
    expect(button.className).toContain("hover:bg-gray-100");

    rerender(<Button variant="link">Link</Button>);
    button = screen.getByRole("button");
    expect(button.className).toContain("text-blue-600");
  });

  it("should apply size classes", () => {
    const { rerender } = render(<Button size="default">Default</Button>);
    let button = screen.getByRole("button");
    expect(button.className).toContain("h-10");

    rerender(<Button size="sm">Small</Button>);
    button = screen.getByRole("button");
    expect(button.className).toContain("h-9");

    rerender(<Button size="lg">Large</Button>);
    button = screen.getByRole("button");
    expect(button.className).toContain("h-11");

    rerender(<Button size="icon">Icon</Button>);
    button = screen.getByRole("button");
    expect(button.className).toContain("h-10");
    expect(button.className).toContain("w-10");
  });

  it("should forward ref", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("should apply custom className", () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("custom-class");
  });

  it("should pass through other props", () => {
    render(
      <Button type="submit" form="test-form" aria-label="Submit form">
        Submit
      </Button>,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveAttribute("form", "test-form");
    expect(button).toHaveAttribute("aria-label", "Submit form");
  });

  it("should apply default variant and size when not specified", () => {
    render(<Button>Default</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("bg-blue-600"); // default variant
    expect(button.className).toContain("h-10"); // default size
  });

  it("should apply disabled styles", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("disabled:opacity-50");
    expect(button.className).toContain("disabled:pointer-events-none");
  });

  it("should apply focus styles", () => {
    render(<Button>Focusable</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("focus-visible:outline-none");
    expect(button.className).toContain("focus-visible:ring-2");
  });
});
