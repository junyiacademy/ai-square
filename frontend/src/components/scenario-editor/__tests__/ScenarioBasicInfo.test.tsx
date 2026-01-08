import { render, screen, fireEvent } from "@testing-library/react";
import { ScenarioBasicInfo } from "../ScenarioBasicInfo";

describe("ScenarioBasicInfo", () => {
  const mockDraft = {
    title: { en: "Test Scenario", zh: "測試場景" },
    description: { en: "Test description", zh: "測試描述" },
    difficulty: "medium",
    estimatedMinutes: 30,
    mode: "pbl" as const,
  };

  const defaultProps = {
    draft: mockDraft,
    language: "zh",
    editingField: null,
    editingValue: "",
    isExpanded: true,
    onToggle: jest.fn(),
    onStartEditing: jest.fn(),
    onEditingValueChange: jest.fn(),
    onSave: jest.fn(),
    onCancel: jest.fn(),
    onUpdateDraft: jest.fn(),
  };

  it("displays scenario title in selected language", () => {
    render(<ScenarioBasicInfo {...defaultProps} />);
    expect(screen.getByText("測試場景")).toBeInTheDocument();
  });

  it("displays scenario description", () => {
    render(<ScenarioBasicInfo {...defaultProps} />);
    expect(screen.getByText("測試描述")).toBeInTheDocument();
  });

  it("displays difficulty level", () => {
    render(<ScenarioBasicInfo {...defaultProps} />);
    expect(screen.getByText("中等")).toBeInTheDocument();
  });

  it("displays estimated time", () => {
    render(<ScenarioBasicInfo {...defaultProps} />);
    expect(screen.getByText("30 分鐘")).toBeInTheDocument();
  });

  it("calls onToggle when header is clicked", () => {
    render(<ScenarioBasicInfo {...defaultProps} />);
    const header = screen.getByRole("button", { name: /基本資訊/ });
    fireEvent.click(header);
    expect(defaultProps.onToggle).toHaveBeenCalled();
  });

  it("collapses when isExpanded is false", () => {
    render(<ScenarioBasicInfo {...defaultProps} isExpanded={false} />);
    expect(screen.queryByText("測試場景")).not.toBeInTheDocument();
  });
});
