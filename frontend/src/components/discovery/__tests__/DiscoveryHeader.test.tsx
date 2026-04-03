import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "@/test-utils/helpers/render";
import { useRouter, usePathname } from "next/navigation";
import DiscoveryHeader from "../DiscoveryHeader";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        title: "探索世界",
        subtitle: "發現你的 AI 學習路徑",
        "navigation:home": "首頁",
        "discovery:navigation.overview": "總覽",
        "discovery:navigation.scenarios": "職業冒險",
      };
      return translations[key] || key;
    },
  }),
}));

describe("DiscoveryHeader", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (usePathname as jest.Mock).mockReturnValue("/discovery/overview");
  });

  it("should render header with title and subtitle", () => {
    renderWithProviders(<DiscoveryHeader />);

    const titles = screen.getAllByText("探索世界");
    expect(titles).toHaveLength(2); // breadcrumb + main title
    expect(screen.getByText("發現你的 AI 學習路徑")).toBeInTheDocument();
  });

  it("should render navigation items without evaluation", () => {
    renderWithProviders(<DiscoveryHeader />);

    expect(screen.getAllByText("總覽").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("職業冒險").length).toBeGreaterThanOrEqual(1);
    // Evaluation should NOT be present
    expect(screen.queryByText("評估")).not.toBeInTheDocument();
  });

  it("should highlight active navigation item", () => {
    renderWithProviders(<DiscoveryHeader />);

    const overviewButtons = screen.getAllByRole("button", { name: /總覽/i });
    expect(overviewButtons[0]).toHaveClass("bg-purple-600");
  });

  it("should navigate when clicking navigation items", () => {
    renderWithProviders(<DiscoveryHeader />);

    const scenariosButtons = screen.getAllByRole("button", { name: /職業冒險/i });
    fireEvent.click(scenariosButtons[0]);

    expect(mockPush).toHaveBeenCalledWith("/discovery/scenarios");
  });

  it("should navigate home when clicking breadcrumb", () => {
    renderWithProviders(<DiscoveryHeader />);

    const homeButton = screen.getByRole("button", { name: /首頁/i });
    fireEvent.click(homeButton);

    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("should show different active state based on pathname", () => {
    (usePathname as jest.Mock).mockReturnValue("/discovery/scenarios");
    renderWithProviders(<DiscoveryHeader />);

    const scenariosButtons = screen.getAllByRole("button", { name: /職業冒險/i });
    expect(scenariosButtons[0]).toHaveClass("bg-purple-600");
  });
});
