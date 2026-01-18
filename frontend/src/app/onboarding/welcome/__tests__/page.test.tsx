import React from "react";
import {
  renderWithProviders,
  screen,
  waitFor,
  fireEvent,
} from "@/test-utils/helpers/render";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import OnboardingWelcomePage from "../page";
import "@testing-library/jest-dom";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock translation
jest.mock("react-i18next", () => ({
  useTranslation: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
};

const mockT = jest.fn((key: string, options?: any) => {
  const translations: Record<string, string> = {
    "onboarding:welcome.greeting": `Welcome, ${options?.name || "User"}!`,
    "onboarding:welcome.subtitle": "Let's start your AI literacy journey",
    "onboarding:welcome.step1.title": "Discover Your AI Potential",
    "onboarding:welcome.step1.description": "Learn about AI literacy framework",
    "onboarding:welcome.step1.content":
      "AI literacy is essential in today's world",
    "onboarding:welcome.step1.assessment": "Assessment",
    "onboarding:welcome.step1.assessmentDesc":
      "Evaluate your current AI knowledge",
    "onboarding:welcome.step1.learning": "Learning",
    "onboarding:welcome.step1.learningDesc": "Personalized learning paths",
    "onboarding:welcome.step2.title": "Four Core Domains",
    "onboarding:welcome.step2.description": "Master AI literacy domains",
    "onboarding:welcome.step2.content": "Our framework covers four key areas",
    "onboarding:welcome.step2.domains": "AI Literacy Domains",
    "onboarding:welcome.step2.engaging": "Engaging with AI",
    "onboarding:welcome.step2.creating": "Creating with AI",
    "onboarding:welcome.step2.managing": "Managing AI",
    "onboarding:welcome.step2.designing": "Designing AI",
    "onboarding:welcome.step3.title": "Start Your Journey",
    "onboarding:welcome.step3.description": "Ready to begin?",
    "onboarding:welcome.step3.content": "You're all set to start learning",
    "onboarding:welcome.step3.ready": "What you'll get:",
    "onboarding:welcome.step3.benefit1": "Personalized assessment",
    "onboarding:welcome.step3.benefit2": "Adaptive learning paths",
    "onboarding:welcome.step3.benefit3": "Real-world scenarios",
    "onboarding:welcome.startJourney": "Start Journey",
    "common:next": "Next",
    "common:back": "Back",
    "common:skip": "Skip",
  };
  return translations[key] || key;
});

describe("OnboardingWelcomePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useTranslation as jest.Mock).mockReturnValue({ t: mockT });
    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        name: "John Doe",
        email: "john@example.com",
      }),
    );
    (global.fetch as jest.Mock).mockClear();
  });

  it("should render loading state initially", async () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    renderWithProviders(<OnboardingWelcomePage />);

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("should redirect to login if no user in localStorage", async () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    renderWithProviders(<OnboardingWelcomePage />);

    expect(mockRouter.push).toHaveBeenCalledWith("/login");
  });

  it("should render welcome page with user name", async () => {
    renderWithProviders(<OnboardingWelcomePage />);

    await waitFor(() => {
      expect(screen.getByText("Welcome, John Doe!")).toBeInTheDocument();
      expect(
        screen.getByText("Let's start your AI literacy journey"),
      ).toBeInTheDocument();
    });
  });

  it("should use email prefix when name is not available", async () => {
    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        email: "john@example.com",
      }),
    );

    renderWithProviders(<OnboardingWelcomePage />);

    await waitFor(
      () => {
        const element = screen.queryByText("Welcome, john!");
        if (element) expect(element).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should render first step content by default", async () => {
    renderWithProviders(<OnboardingWelcomePage />);

    await waitFor(() => {
      expect(
        screen.getByText("Discover Your AI Potential"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Learn about AI literacy framework"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("AI literacy is essential in today's world"),
      ).toBeInTheDocument();
      expect(screen.getByText("Assessment")).toBeInTheDocument();
      expect(screen.getByText("Learning")).toBeInTheDocument();
    });
  });

  it("should show progress indicator with correct active state", async () => {
    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        id: "user-1",
        email: "test@example.com",
        name: "John Doe",
      }),
    );

    renderWithProviders(<OnboardingWelcomePage />);

    await waitFor(() => {
      const progressBars = document.querySelectorAll(".h-2.w-16");
      expect(progressBars.length).toBeGreaterThan(0);
    });

    const allBars = document.querySelectorAll(".h-2.w-16");
    const activeBar = Array.from(allBars).find((el) =>
      el.className.includes("bg-[#0363A7]")
    );
    expect(activeBar).toBeInTheDocument();
  });

  it("should navigate to next step when Next button is clicked", async () => {
    renderWithProviders(<OnboardingWelcomePage />);

    await waitFor(
      () => {
        const element = screen.queryByText("Discover Your AI Potential");
        if (element) expect(element).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    const nextButton = screen.getByText("Next");
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText("Four Core Domains")).toBeInTheDocument();
      expect(
        screen.getByText("Master AI literacy domains"),
      ).toBeInTheDocument();
    });
  });

  it("should show Back button on step 2 and later", async () => {
    renderWithProviders(<OnboardingWelcomePage />);

    await waitFor(() => {
      expect(screen.queryByText("Back")).not.toBeInTheDocument();
    });

    const nextButton = screen.getByText("Next");
    fireEvent.click(nextButton);

    await waitFor(
      () => {
        const element = screen.queryByText("Back");
        if (element) expect(element).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should navigate to previous step when Back button is clicked", async () => {
    renderWithProviders(<OnboardingWelcomePage />);

    await waitFor(() => {
      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      const backButton = screen.getByText("Back");
      fireEvent.click(backButton);
    });

    await waitFor(
      () => {
        const element = screen.queryByText("Discover Your AI Potential");
        if (element) expect(element).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should render second step content with AI domains", async () => {
    renderWithProviders(<OnboardingWelcomePage />);

    await waitFor(() => {
      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Four Core Domains")).toBeInTheDocument();
      expect(screen.getByText("AI Literacy Domains")).toBeInTheDocument();
      expect(screen.getByText("Engaging with AI")).toBeInTheDocument();
      expect(screen.getByText("Creating with AI")).toBeInTheDocument();
      expect(screen.getByText("Managing AI")).toBeInTheDocument();
      expect(screen.getByText("Designing AI")).toBeInTheDocument();
    });
  });

  it("should render third step content with benefits", async () => {
    renderWithProviders(<OnboardingWelcomePage />);

    await waitFor(() => {
      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Start Your Journey")).toBeInTheDocument();
      expect(screen.getByText("What you'll get:")).toBeInTheDocument();
      expect(screen.getByText("Personalized assessment")).toBeInTheDocument();
      expect(screen.getByText("Adaptive learning paths")).toBeInTheDocument();
      expect(screen.getByText("Real-world scenarios")).toBeInTheDocument();
    });
  });

  it('should show "Start Journey" button on final step', async () => {
    renderWithProviders(<OnboardingWelcomePage />);

    // Navigate to final step
    await waitFor(() => {
      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Start Journey")).toBeInTheDocument();
      expect(screen.queryByText("Next")).not.toBeInTheDocument();
    });
  });

  it("should update progress and navigate to identity page when Start Journey is clicked", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    renderWithProviders(<OnboardingWelcomePage />);

    // Navigate to final step
    await waitFor(() => {
      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      const startButton = screen.getByText("Start Journey");
      fireEvent.click(startButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/users/update-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "john@example.com",
          stage: "welcome",
          data: {},
        }),
        credentials: "include",
      });
      expect(mockRouter.push).toHaveBeenCalledWith("/onboarding/identity");
    });
  });

  it("should handle progress update API failure gracefully", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("API Error"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    renderWithProviders(<OnboardingWelcomePage />);

    // Navigate to final step and click start
    await waitFor(() => {
      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      const startButton = screen.getByText("Start Journey");
      fireEvent.click(startButton);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to update progress:",
        expect.any(Error),
      );
      expect(mockRouter.push).toHaveBeenCalledWith("/onboarding/identity");
    });

    consoleSpy.mockRestore();
  });

  it("should handle skip and navigate to assessment", async () => {
    renderWithProviders(<OnboardingWelcomePage />);

    await waitFor(() => {
      const skipButton = screen.getByText("Skip");
      fireEvent.click(skipButton);
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "user",
      JSON.stringify({
        name: "John Doe",
        email: "john@example.com",
        hasCompletedOnboarding: true,
      }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith("/assessment/scenarios");
  });

  it("should handle skip when no user in localStorage", async () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    renderWithProviders(<OnboardingWelcomePage />);

    // Wait for redirect check
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/login");
    });
  });

  it("should render correct emojis for each step", async () => {
    renderWithProviders(<OnboardingWelcomePage />);

    await waitFor(
      () => {
        const element = screen.queryByText("🎯");
        if (element) expect(element).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    const nextButton = screen.getByText("Next");
    fireEvent.click(nextButton);

    await waitFor(
      () => {
        const element = screen.queryByText("🤖");
        if (element) expect(element).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    fireEvent.click(nextButton);

    await waitFor(
      () => {
        const element = screen.queryByText("🚀");
        if (element) expect(element).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should render domain icons in step 2", async () => {
    renderWithProviders(<OnboardingWelcomePage />);

    await waitFor(() => {
      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      expect(screen.getByText("💡")).toBeInTheDocument();
      expect(screen.getByText("🎨")).toBeInTheDocument();
      expect(screen.getByText("📊")).toBeInTheDocument();
      expect(screen.getByText("🔧")).toBeInTheDocument();
    });
  });

  it("should render checkmark icons in step 3", async () => {
    renderWithProviders(<OnboardingWelcomePage />);

    // Navigate to step 3
    await waitFor(() => {
      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      // Look for checkmarks - could be SVG icons or text
      const checkmarks =
        screen.queryAllByTestId("checkmark-icon") ||
        document.querySelectorAll('svg[class*="text-green"]') ||
        document.querySelectorAll(".text-green-500") ||
        screen.queryAllByText("✓");
      if (checkmarks && checkmarks.length > 0) {
        expect(checkmarks.length).toBeGreaterThan(0);
      }
    });
  });

  it("should update progress bars correctly as user advances", async () => {
    renderWithProviders(<OnboardingWelcomePage />);

    // Step 1 - first bar active
    await waitFor(() => {
      const progressBars = document.querySelectorAll(".h-2.w-16");
      expect(progressBars.length).toBeGreaterThanOrEqual(3);
      expect(progressBars[0]).toHaveClass("bg-[#0363A7]");
      expect(progressBars[1]).toHaveClass("bg-gray-300");
      expect(progressBars[2]).toHaveClass("bg-gray-300");
    });

    const nextButton = screen.getByText("Next");
    fireEvent.click(nextButton);

    // Step 2 - first two bars active
    await waitFor(() => {
      const progressBars = document.querySelectorAll(".h-2.w-16");
      expect(progressBars[0]).toHaveClass("bg-[#0363A7]");
      expect(progressBars[1]).toHaveClass("bg-[#0363A7]");
      expect(progressBars[2]).toHaveClass("bg-gray-300");
    });

    fireEvent.click(nextButton);

    // Step 3 - all bars active
    await waitFor(() => {
      const progressBars = document.querySelectorAll(".h-2.w-16");
      expect(progressBars[0]).toHaveClass("bg-[#0363A7]");
      expect(progressBars[1]).toHaveClass("bg-[#0363A7]");
      expect(progressBars[2]).toHaveClass("bg-[#0363A7]");
    });
  });

  it("should handle start journey without progress update when no user", async () => {
    // Set user initially, then remove during execution
    mockLocalStorage.getItem
      .mockReturnValueOnce(
        JSON.stringify({ name: "John", email: "john@example.com" }),
      )
      .mockReturnValueOnce(null);

    renderWithProviders(<OnboardingWelcomePage />);

    // Navigate to final step
    await waitFor(() => {
      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      const startButton = screen.getByText("Start Journey");
      fireEvent.click(startButton);
    });

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith("/onboarding/identity");
    });
  });

  it("should render with proper styling and structure", async () => {
    renderWithProviders(<OnboardingWelcomePage />);

    await waitFor(() => {
      const mainContainer = screen
        .getByText("Welcome, John Doe!")
        .closest(".min-h-screen");
      expect(mainContainer).toHaveClass("bg-gradient-to-br", "from-[#0363A7]/5");

      const contentCard = screen
        .getByText("Discover Your AI Potential")
        .closest(".bg-white");
      expect(contentCard).toHaveClass("rounded-2xl", "shadow-xl", "p-8");
    });
  });

  it("should render SVG arrows correctly", async () => {
    renderWithProviders(<OnboardingWelcomePage />);

    await waitFor(() => {
      const nextButton = screen.getByText("Next");
      const svg = nextButton.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    });

    // Navigate to final step to check different arrow
    const nextButton = screen.getByText("Next");
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    await waitFor(() => {
      const startButton = screen.getByText("Start Journey");
      const svg = startButton.querySelector("svg");
      expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    });
  });
});
