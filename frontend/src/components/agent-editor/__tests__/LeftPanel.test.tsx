import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LeftPanel } from "../LeftPanel";

describe("LeftPanel Component", () => {
  const mockProps = {
    leftPanelCollapsed: false,
    setLeftPanelCollapsed: jest.fn(),
    selectedMode: null as "pbl" | "discovery" | "assessment" | null,
    setSelectedMode: jest.fn(),
    selectedScenario: null,
    setSelectedScenario: jest.fn(),
    loadScenarios: jest.fn(),
    setExpandedSections: jest.fn(),
    setExpandedTasks: jest.fn(),
    hasChanges: false,
    getChangeSummary: jest.fn(() => []),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render with collapsed state", () => {
      const { container } = render(
        <LeftPanel {...mockProps} leftPanelCollapsed={true} />,
      );
      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveClass("w-16");
    });

    it("should render with expanded state", () => {
      const { container } = render(<LeftPanel {...mockProps} />);
      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveClass("w-64");
    });

    it("should display all three mode buttons when expanded", () => {
      render(<LeftPanel {...mockProps} />);
      expect(screen.getByText("PBL")).toBeInTheDocument();
      expect(screen.getByText("DISCOVERY")).toBeInTheDocument();
      expect(screen.getByText("ASSESSMENT")).toBeInTheDocument();
    });

    it("should not display mode buttons when collapsed", () => {
      render(<LeftPanel {...mockProps} leftPanelCollapsed={true} />);
      expect(screen.queryByText("PBL")).not.toBeInTheDocument();
      expect(screen.queryByText("DISCOVERY")).not.toBeInTheDocument();
    });
  });

  describe("Mode Selection", () => {
    it('should call setSelectedMode with "pbl" when PBL button clicked', () => {
      render(<LeftPanel {...mockProps} />);
      const pblButton = screen.getByText("PBL").closest("button");
      fireEvent.click(pblButton!);

      expect(mockProps.setSelectedMode).toHaveBeenCalledWith("pbl");
      expect(mockProps.loadScenarios).toHaveBeenCalled();
      expect(mockProps.setSelectedScenario).toHaveBeenCalledWith(null);
    });

    it('should call setSelectedMode with "discovery" when Discovery button clicked', () => {
      render(<LeftPanel {...mockProps} />);
      const discoveryButton = screen.getByText("DISCOVERY").closest("button");
      fireEvent.click(discoveryButton!);

      expect(mockProps.setSelectedMode).toHaveBeenCalledWith("discovery");
      expect(mockProps.loadScenarios).toHaveBeenCalled();
    });

    it('should call setSelectedMode with "assessment" when Assessment button clicked', () => {
      render(<LeftPanel {...mockProps} />);
      const assessmentButton = screen.getByText("ASSESSMENT").closest("button");
      fireEvent.click(assessmentButton!);

      expect(mockProps.setSelectedMode).toHaveBeenCalledWith("assessment");
      expect(mockProps.loadScenarios).toHaveBeenCalled();
    });

    it("should highlight selected mode", () => {
      render(<LeftPanel {...mockProps} selectedMode="pbl" />);
      const pblButton = screen.getByText("PBL").closest("button");
      expect(pblButton).toHaveClass("border-purple-400");
    });
  });

  describe("Panel Collapse/Expand", () => {
    it("should toggle collapse state when collapse button clicked", () => {
      render(<LeftPanel {...mockProps} />);
      const collapseButton = screen.getByRole("button", { name: "" });
      fireEvent.click(collapseButton);

      expect(mockProps.setLeftPanelCollapsed).toHaveBeenCalledWith(true);
    });

    it("should show correct icon when collapsed", () => {
      const { container } = render(
        <LeftPanel {...mockProps} leftPanelCollapsed={true} />,
      );
      // PanelLeftOpen icon should be visible when collapsed
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("Back Button (Scenario Selected)", () => {
    it("should show back button when scenario is selected", () => {
      render(<LeftPanel {...mockProps} selectedScenario="scenario-123" />);
      expect(screen.getByText("返回場景列表")).toBeInTheDocument();
    });

    it("should not show back button when no scenario selected", () => {
      render(<LeftPanel {...mockProps} />);
      expect(screen.queryByText("返回場景列表")).not.toBeInTheDocument();
    });

    it("should reset scenario and expanded sections when back button clicked", () => {
      render(<LeftPanel {...mockProps} selectedScenario="scenario-123" />);
      const backButton = screen.getByText("返回場景列表").closest("button");
      fireEvent.click(backButton!);

      expect(mockProps.setSelectedScenario).toHaveBeenCalledWith(null);
      expect(mockProps.setExpandedSections).toHaveBeenCalledWith({
        "scenario-basic": true,
        "scenario-objectives": true,
        "scenario-mode-specific": true,
        "scenario-advanced": false,
      });
      expect(mockProps.setExpandedTasks).toHaveBeenCalledWith({});
    });
  });

  describe("Change Status Display", () => {
    it('should show "已保存" when no changes', () => {
      render(<LeftPanel {...mockProps} hasChanges={false} />);
      expect(screen.getByText("已保存")).toBeInTheDocument();
    });

    it("should show change count when has changes", () => {
      const getChangeSummary = jest.fn(() => ["change1", "change2", "change3"]);
      render(
        <LeftPanel
          {...mockProps}
          hasChanges={true}
          getChangeSummary={getChangeSummary}
        />,
      );
      expect(screen.getByText("3 個變更")).toBeInTheDocument();
    });

    it("should not show change count text when collapsed", () => {
      const getChangeSummary = jest.fn(() => ["change1", "change2"]);
      render(
        <LeftPanel
          {...mockProps}
          leftPanelCollapsed={true}
          hasChanges={true}
          getChangeSummary={getChangeSummary}
        />,
      );
      expect(screen.queryByText("2 個變更")).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle null selectedMode", () => {
      render(<LeftPanel {...mockProps} selectedMode={null} />);
      const pblButton = screen.getByText("PBL").closest("button");
      expect(pblButton).not.toHaveClass("border-purple-400");
    });

    it("should handle empty change summary", () => {
      const getChangeSummary = jest.fn(() => []);
      render(
        <LeftPanel
          {...mockProps}
          hasChanges={true}
          getChangeSummary={getChangeSummary}
        />,
      );
      expect(screen.getByText("0 個變更")).toBeInTheDocument();
    });

    it("should maintain collapsed width transition class", () => {
      const { container } = render(
        <LeftPanel {...mockProps} leftPanelCollapsed={true} />,
      );
      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveClass("transition-all", "duration-300");
    });
  });
});
