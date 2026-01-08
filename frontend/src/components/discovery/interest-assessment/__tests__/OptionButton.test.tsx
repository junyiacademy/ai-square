import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { OptionButton } from "../OptionButton";

describe("OptionButton", () => {
  const mockOption = {
    id: "opt1",
    text: "Test Option",
    weight: { tech: 1, creative: 0, business: 0 },
  };

  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render option text", () => {
    render(
      <OptionButton
        option={mockOption}
        isSelected={false}
        index={0}
        onSelect={mockOnSelect}
      />,
    );

    expect(screen.getByText("Test Option")).toBeInTheDocument();
  });

  it("should call onSelect when clicked", () => {
    render(
      <OptionButton
        option={mockOption}
        isSelected={false}
        index={0}
        onSelect={mockOnSelect}
      />,
    );

    fireEvent.click(screen.getByText("Test Option"));
    expect(mockOnSelect).toHaveBeenCalledWith("opt1");
  });

  it("should show selected state", () => {
    const { container } = render(
      <OptionButton
        option={mockOption}
        isSelected={true}
        index={0}
        onSelect={mockOnSelect}
      />,
    );

    const button = container.querySelector("button");
    expect(button?.className).toContain("border-purple-500");
  });

  it("should show unselected state", () => {
    const { container } = render(
      <OptionButton
        option={mockOption}
        isSelected={false}
        index={0}
        onSelect={mockOnSelect}
      />,
    );

    const button = container.querySelector("button");
    expect(button?.className).toContain("border-gray-200");
  });
});
