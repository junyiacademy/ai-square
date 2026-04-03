import React from "react";
import {
  renderWithProviders,
  screen,
} from "@/test-utils/helpers/render";
import DiscoveryPageLayout from "../DiscoveryPageLayout";
import { useDiscoveryData } from "@/hooks/useDiscoveryData";
import "@testing-library/jest-dom";

// Mock DiscoveryHeader component
jest.mock("@/components/discovery/DiscoveryHeader", () => {
  return function MockDiscoveryHeader({
    achievementCount,
    workspaceCount,
  }: any) {
    return (
      <div data-testid="discovery-header">
        <span data-testid="achievement-count">{achievementCount}</span>
        <span data-testid="workspace-count">{workspaceCount}</span>
      </div>
    );
  };
});

// Mock useDiscoveryData hook
jest.mock("@/hooks/useDiscoveryData", () => ({
  useDiscoveryData: jest.fn(),
}));

const mockUseDiscoveryData = useDiscoveryData as jest.Mock;

describe("DiscoveryPageLayout", () => {
  const mockChildren = (
    <div data-testid="test-children">Test Children Content</div>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render loading state when isLoading is true", () => {
    mockUseDiscoveryData.mockReturnValue({
      isLoading: true,
      achievementCount: 0,
    });

    renderWithProviders(
      <DiscoveryPageLayout>{mockChildren}</DiscoveryPageLayout>,
    );

    expect(screen.getByText("載入中...")).toBeInTheDocument();
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByTestId("test-children")).not.toBeInTheDocument();
    expect(screen.queryByTestId("discovery-header")).not.toBeInTheDocument();
  });

  it("should render children when loading is complete", () => {
    mockUseDiscoveryData.mockReturnValue({
      isLoading: false,
      achievementCount: 5,
    });

    renderWithProviders(
      <DiscoveryPageLayout>{mockChildren}</DiscoveryPageLayout>,
    );

    expect(screen.getByTestId("discovery-header")).toBeInTheDocument();
    expect(screen.getByTestId("test-children")).toBeInTheDocument();
    expect(screen.getByTestId("achievement-count")).toHaveTextContent("5");
    expect(screen.getByTestId("workspace-count")).toHaveTextContent("0");
    expect(screen.queryByText("載入中...")).not.toBeInTheDocument();
  });

  it("should handle multiple children", () => {
    mockUseDiscoveryData.mockReturnValue({
      isLoading: false,
      achievementCount: 1,
    });

    renderWithProviders(
      <DiscoveryPageLayout>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </DiscoveryPageLayout>,
    );

    expect(screen.getByTestId("child-1")).toBeInTheDocument();
    expect(screen.getByTestId("child-2")).toBeInTheDocument();
  });

  it("should render with proper CSS classes", () => {
    mockUseDiscoveryData.mockReturnValue({
      isLoading: false,
      achievementCount: 4,
    });

    const { container } = renderWithProviders(
      <DiscoveryPageLayout>{mockChildren}</DiscoveryPageLayout>,
    );

    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass("min-h-screen", "bg-gradient-to-br");

    const contentContainer = container.querySelector(".max-w-7xl");
    expect(contentContainer).toHaveClass("mx-auto", "px-4");
  });
});
