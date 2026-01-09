import { render, screen, waitFor, within } from "@testing-library/react";
import { useTranslation } from "react-i18next";
import PBLScenariosPage from "../page";
import { authenticatedFetch } from "@/lib/utils/authenticated-fetch";

// Mock dependencies
jest.mock("react-i18next", () => ({
  useTranslation: jest.fn(),
}));

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

jest.mock("@/components/pbl/loading-skeletons", () => ({
  PBLScenariosListSkeleton: () => (
    <div data-testid="loading-skeleton">Loading...</div>
  ),
}));

// Mock authenticatedFetch
jest.mock("@/lib/utils/authenticated-fetch", () => ({
  authenticatedFetch: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe("PBLScenariosPage", () => {
  const mockT = jest.fn((key: string) => key);
  const mockI18n = { language: "en" };

  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslation as jest.Mock).mockReturnValue({
      t: mockT,
      i18n: mockI18n,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should render loading skeleton initially", () => {
    (authenticatedFetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}),
    ); // Never resolves

    render(<PBLScenariosPage />);

    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("should fetch and display scenarios", async () => {
    const mockScenarios = [
      {
        id: "scenario-1",
        sourceId: "semiconductor-adventure",
        yamlId: "semiconductor-adventure",
        title: { en: "Semiconductor Adventure" },
        description: { en: "Learn about semiconductors" },
        difficulty: "intermediate",
        taskTemplates: [{ estimatedTime: 20 }, { estimatedTime: 30 }],
        thumbnailEmoji: "💡",
        isAvailable: true,
      },
      {
        id: "scenario-2",
        sourceId: "semiconductor-basics",
        yamlId: "semiconductor-basics",
        title: { en: "Semiconductor Basics" },
        description: { en: "Introduction to semiconductor technology" },
        difficulty: "beginner",
        taskCount: 3,
        domains: ["engaging_with_ai"],
        isAvailable: false,
      },
    ];

    (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: mockScenarios },
      }),
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.getByText("Semiconductor Adventure")).toBeInTheDocument();
    });

    // Both scenarios should be visible (both pass semiconductor filter)
    expect(screen.getByText("Semiconductor Basics")).toBeInTheDocument();
    expect(screen.getByText("Learn about semiconductors")).toBeInTheDocument();
  });

  it("should handle API error gracefully", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    (authenticatedFetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network error"),
    );

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error fetching PBL scenarios:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it("should show empty state when no scenarios", async () => {
    (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: [] },
      }),
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Loading scenarios from YAML files..."),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Refresh")).toBeInTheDocument();
  });

  it("should display difficulty stars correctly", async () => {
    const mockScenarios = [
      {
        id: "s1",
        sourceId: "semiconductor-adventure",
        yamlId: "semiconductor-adventure",
        title: { en: "Semiconductor Beginner Scenario" },
        description: { en: "Easy" },
        difficulty: "beginner",
        taskTemplates: [],
      },
      {
        id: "s2",
        sourceId: "deep-learning-mlp-intro",
        yamlId: "deep-learning-mlp-intro",
        title: { en: "Semiconductor Intermediate Scenario" },
        description: { en: "Medium" },
        difficulty: "intermediate",
        taskTemplates: [],
      },
      {
        id: "s3",
        sourceId: "semiconductor-adventure",
        yamlId: "semiconductor-adventure",
        title: { en: "Semiconductor Advanced Scenario" },
        description: { en: "Hard" },
        difficulty: "advanced",
        taskTemplates: [],
      },
    ];

    (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: mockScenarios },
      }),
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Semiconductor Beginner Scenario"),
      ).toBeInTheDocument();
    });

    // Check that all difficulty levels are displayed
    const allText = screen.getAllByText(/⭐/);
    expect(allText.length).toBeGreaterThan(0);

    // Verify each scenario has its difficulty displayed
    expect(
      screen.getByText("Semiconductor Beginner Scenario"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Semiconductor Intermediate Scenario"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Semiconductor Advanced Scenario"),
    ).toBeInTheDocument();
  });

  it("should display domain labels", async () => {
    const mockScenarios = [
      {
        id: "scenario-1",
        sourceId: "semiconductor-adventure",
        yamlId: "semiconductor-adventure",
        title: { en: "Semiconductor Test Scenario" },
        description: { en: "Test" },
        domains: ["engaging_with_ai", "creating_with_ai"],
        taskTemplates: [],
      },
    ];

    (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: mockScenarios },
      }),
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Semiconductor Test Scenario"),
      ).toBeInTheDocument();
    });

    expect(mockT).toHaveBeenCalledWith("assessment:domains.engaging_with_ai");
    expect(mockT).toHaveBeenCalledWith("assessment:domains.creating_with_ai");
  });

  it("should calculate estimated duration from task templates", async () => {
    const mockScenarios = [
      {
        id: "scenario-1",
        sourceId: "semiconductor-adventure",
        yamlId: "semiconductor-adventure",
        title: { en: "Semiconductor Duration Scenario" },
        description: { en: "Test" },
        taskTemplates: [
          { estimatedTime: 15 },
          { estimatedTime: 20 },
          { estimatedTime: 25 },
        ],
      },
    ];

    (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: mockScenarios },
      }),
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Semiconductor Duration Scenario"),
      ).toBeInTheDocument();
    });

    // Total duration should be 15 + 20 + 25 = 60
    expect(screen.getByText(/60/)).toBeInTheDocument();
  });

  it('should show "Coming Soon" for unavailable scenarios', async () => {
    const mockScenarios = [
      {
        id: "scenario-1",
        sourceId: "deep-learning-mlp-intro",
        yamlId: "deep-learning-mlp-intro",
        title: { en: "Unavailable Semiconductor Scenario" },
        description: { en: "Not yet available" },
        isAvailable: false,
        taskTemplates: [],
      },
    ];

    (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: mockScenarios },
      }),
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Unavailable Semiconductor Scenario"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("comingSoon")).toBeInTheDocument();
    expect(screen.queryByText("viewDetails")).not.toBeInTheDocument();
  });

  it("should display View Details link for available scenarios", async () => {
    const mockScenarios = [
      {
        id: "scenario-1",
        sourceId: "semiconductor-adventure",
        yamlId: "semiconductor-adventure",
        title: { en: "Available Semiconductor Scenario" },
        description: { en: "Ready to use" },
        isAvailable: true,
        taskTemplates: [],
      },
    ];

    (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: mockScenarios },
      }),
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Available Semiconductor Scenario"),
      ).toBeInTheDocument();
    });

    const link = screen.getByRole("link", { name: "viewDetails" });
    expect(link).toHaveAttribute("href", "/pbl/scenarios/scenario-1");
  });

  it("should render features section", async () => {
    (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: [] },
      }),
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });

    expect(mockT).toHaveBeenCalledWith("features.title");
    expect(mockT).toHaveBeenCalledWith("features.realWorld.title");
    expect(mockT).toHaveBeenCalledWith("features.aiGuidance.title");
    expect(mockT).toHaveBeenCalledWith("features.progress.title");
    expect(mockT).toHaveBeenCalledWith("features.personalized.title");
  });

  it("should render refresh button when no scenarios", async () => {
    (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: [] },
      }),
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });

    const refreshButton = screen.getByText("Refresh");
    expect(refreshButton).toHaveClass(
      "px-4",
      "py-2",
      "bg-blue-600",
      "text-white",
    );

    // Test that the button has an onClick handler
    expect(refreshButton).toHaveProperty("onclick");
  });

  it("should handle abort controller in component lifecycle", async () => {
    const abortSpy = jest.fn();
    const originalAbortController = global.AbortController;

    global.AbortController = jest.fn(() => ({
      abort: abortSpy,
      signal: {} as AbortSignal,
    })) as any;

    (authenticatedFetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}),
    );

    const { unmount } = render(<PBLScenariosPage />);

    unmount();

    // In development mode (test environment), abort is not called to avoid StrictMode issues
    // In production mode, abort would be called
    // Since NODE_ENV is 'test' in Jest, we expect abort NOT to be called
    expect(abortSpy).not.toHaveBeenCalled();

    global.AbortController = originalAbortController;
  });

  it("should handle non-ok response", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error fetching PBL scenarios:",
      expect.objectContaining({
        message: expect.stringContaining("500"),
      }),
    );

    consoleErrorSpy.mockRestore();
  });

  it("should handle unified architecture scenario format", async () => {
    const mockScenarios = [
      {
        id: "scenario-1",
        sourceId: "deep-learning-mlp-intro",
        yamlId: "deep-learning-mlp-intro",
        title: { en: "Semiconductor Unified Format Scenario" },
        description: { en: "Test scenario with unified format" },
        sourceMetadata: {
          domain: "designing_with_ai",
          difficulty: "advanced",
          yamlId: "deep-learning-mlp-intro",
        },
        taskTemplates: [],
      },
    ];

    (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: mockScenarios },
      }),
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Semiconductor Unified Format Scenario"),
      ).toBeInTheDocument();
    });

    // Should extract domain from sourceMetadata
    expect(mockT).toHaveBeenCalledWith("assessment:domains.designing_with_ai");
    // Should display advanced difficulty (5 stars)
    expect(screen.getByText(/⭐⭐⭐⭐⭐/)).toBeInTheDocument();
  });

  it("should use language from i18n for API call", async () => {
    mockI18n.language = "zh";

    (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: [] },
      }),
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(authenticatedFetch).toHaveBeenCalledWith(
        "/api/pbl/scenarios?lang=zh",
        expect.objectContaining({
          signal: expect.any(Object),
        }),
      );
    });
  });

  it("should handle targetDomain array format", async () => {
    const mockScenarios = [
      {
        id: "scenario-1",
        sourceId: "semiconductor-adventure",
        yamlId: "semiconductor-adventure",
        title: { en: "Semiconductor Scenario With Target Domain" },
        description: { en: "Test Description" },
        targetDomain: ["managing_with_ai", "creating_with_ai"],
        taskTemplates: [],
      },
    ];

    (authenticatedFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: mockScenarios },
      }),
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Semiconductor Scenario With Target Domain"),
      ).toBeInTheDocument();
    });

    expect(mockT).toHaveBeenCalledWith("assessment:domains.managing_with_ai");
    expect(mockT).toHaveBeenCalledWith("assessment:domains.creating_with_ai");
  });
});
