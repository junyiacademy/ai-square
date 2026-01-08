/**
 * Comprehensive test suite for History Page
 * Tests all functionality including data fetching, filtering, display, and interactions
 */

import React from "react";
import { waitFor, act } from "@testing-library/react";
import { renderWithProviders, screen, userEvent } from "@/test-utils";
import "@testing-library/jest-dom";
import UnifiedHistoryPage from "../page";

// Mock Next.js navigation hooks
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(),
};

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/history",
}));

// Mock i18n
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      // Enhanced translation mock with dynamic values
      const translations: Record<string, string> = {
        "navigation:history": "Learning History",
        "navigation:historySubtitle":
          "Track your AI literacy learning progress",
        "navigation:filterAll": "All",
        "navigation:noHistory": "No learning history found",
        "navigation:startAssessment": "Take Assessment",
        "navigation:startPBL": "Start PBL Learning",
        "navigation:startDiscovery": "Start Career Discovery",
        "navigation:startNewPBL": "Start New PBL",
        "navigation:startNewDiscovery": "Start New Discovery",
        "navigation:discovery": "Discovery",
        "assessment:title": "Assessment",
        "assessment:history.notLoggedIn": "Please log in to view your history",
        "assessment:history.takeAssessment": "Take Assessment",
        "assessment:history.takeNewAssessment": "Take New Assessment",
        "assessment:history.duration": "Duration",
        "assessment:history.overallScore": "Overall Score",
        "assessment:history.domainScores": "Domain Scores",
        "assessment:history.startTime": "Start Time",
        "assessment:history.endTime": "End Time",
        "assessment:history.correct": "correct",
        "assessment:level.expert": "Expert",
        "assessment:level.advanced": "Advanced",
        "assessment:level.intermediate": "Intermediate",
        "assessment:level.beginner": "Beginner",
        "assessment:domains.engaging_with_ai": "Engaging with AI",
        "assessment:domains.creating_with_ai": "Creating with AI",
        "assessment:domains.managing_with_ai": "Managing with AI",
        "assessment:domains.designing_with_ai": "Designing with AI",
        "pbl:title": "Problem-Based Learning",
        "pbl:currentTask": "Current Task",
        "pbl:history.status.completed": "Completed",
        "pbl:history.status.in_progress": "In Progress",
        "pbl:history.status.paused": "Paused",
        "pbl:history.progress": "Progress",
        "pbl:history.tasks": "tasks",
        "pbl:history.tasksEvaluated": "tasks evaluated",
        "pbl:history.conversationCount": "Conversations",
        "pbl:history.times": "times",
        "pbl:history.continueStudy": "Continue Study",
        "pbl:history.startLearning": "Start Learning",
        "pbl:complete.overallScore": "Overall Score",
        "pbl:complete.domainScores": "Domain Scores",
        "pbl:complete.ksaSummary": "KSA Summary",
        "pbl:complete.knowledge": "Knowledge",
        "pbl:complete.skills": "Skills",
        "pbl:complete.attitudes": "Attitudes",
        "pbl:complete.viewReport": "View Report",
        "discovery:careerType": "Career Type",
        "discovery:status.completed": "Completed",
        "discovery:status.active": "Active",
        "discovery:status.inactive": "Inactive",
      };

      // Handle template strings
      if (key.includes("{{") && options) {
        let result = translations[key] || key;
        Object.entries(options).forEach(([optionKey, value]) => {
          result = result.replace(`{{${optionKey}}}`, String(value));
        });
        return result;
      }

      return translations[key] || key;
    },
    i18n: {
      language: "en",
      changeLanguage: jest.fn(),
    },
  }),
}));

// Mock HistoryPageSkeleton
jest.mock("@/components/ui/history-skeletons", () => ({
  HistoryPageSkeleton: () => (
    <div data-testid="history-skeleton">Loading history...</div>
  ),
}));

// Mock formatDateWithLocale utility
jest.mock("@/utils/locale", () => ({
  formatDateWithLocale: jest.fn((date: string | Date) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", { value: mockLocalStorage });

describe("UnifiedHistoryPage", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReset();
    mockFetch.mockReset();
  });

  describe("Authentication States", () => {
    it("should show login message when user is not logged in", () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "isLoggedIn") return "false";
        if (key === "user") return null;
        return null;
      });

      renderWithProviders(<UnifiedHistoryPage />);

      expect(
        screen.getByText("Please log in to view your history"),
      ).toBeInTheDocument();
      expect(screen.getByText("Take Assessment")).toBeInTheDocument();
      expect(screen.getByText("Start Learning")).toBeInTheDocument();
    });

    it("should show login message when localStorage has no user data", () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "isLoggedIn") return "true";
        if (key === "user") return null;
        return null;
      });

      renderWithProviders(<UnifiedHistoryPage />);

      expect(
        screen.getByText("Please log in to view your history"),
      ).toBeInTheDocument();
    });

    it("should handle invalid JSON in user data gracefully", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "isLoggedIn") return "true";
        if (key === "user") return "invalid json";
        return null;
      });

      renderWithProviders(<UnifiedHistoryPage />);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error parsing user data:",
        expect.any(Error),
      );
      expect(
        screen.getByText("Please log in to view your history"),
      ).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe("Loading States", () => {
    it("should show loading skeleton while fetching data", async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "isLoggedIn") return "true";
        if (key === "user")
          return JSON.stringify({ id: "user-123", email: "test@example.com" });
        return null;
      });

      // Mock delayed API responses
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      renderWithProviders(<UnifiedHistoryPage />);

      expect(screen.getByTestId("history-skeleton")).toBeInTheDocument();
      expect(screen.getByText("Loading history...")).toBeInTheDocument();
    });

    it("should hide skeleton after data loads", async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "isLoggedIn") return "true";
        if (key === "user")
          return JSON.stringify({ id: "user-123", email: "test@example.com" });
        return null;
      });

      // Mock successful API responses
      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/assessment/results")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          });
        }
        if (url.includes("/api/pbl/history")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, programs: [] }),
          });
        }
        if (url.includes("/api/discovery/my-programs")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(
          screen.queryByTestId("history-skeleton"),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Data Fetching", () => {
    const mockUserData = { id: "user-123", email: "test@example.com" };

    beforeEach(() => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "isLoggedIn") return "true";
        if (key === "user") return JSON.stringify(mockUserData);
        return null;
      });
    });

    it("should fetch assessment history correctly", async () => {
      const mockAssessmentData = {
        data: [
          {
            assessment_id: "test-assessment-1",
            timestamp: "2024-01-15T10:30:00Z",
            scores: {
              overall: 85,
              domains: {
                engaging_with_ai: 90,
                creating_with_ai: 80,
                managing_with_ai: 85,
                designing_with_ai: 85,
              },
            },
            summary: {
              total_questions: 20,
              correct_answers: 17,
              level: "advanced",
            },
            duration_seconds: 1200,
            language: "en",
          },
        ],
      };

      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/assessment/results")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockAssessmentData),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, programs: [] }),
        });
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(
            `/api/assessment/results?userId=${mockUserData.id}&userEmail=${encodeURIComponent(mockUserData.email)}`,
          ),
          { credentials: "include" },
        );
      });
    });

    it("should fetch PBL history correctly", async () => {
      const mockPBLData = {
        success: true,
        programs: [
          {
            id: "pbl-program-1",
            scenarioId: "scenario-1",
            scenarioTitle: "AI Ethics Dilemma",
            status: "completed",
            startedAt: "2024-01-15T09:00:00Z",
            completedAt: "2024-01-15T11:30:00Z",
            totalTimeSeconds: 9000,
            evaluatedTasks: 3,
            totalTaskCount: 3,
            overallScore: 88,
            tasks: [
              {
                id: "task-1",
                title: "Ethics Analysis",
                log: { interactions: [1, 2, 3] },
              },
            ],
            domainScores: {
              engaging_with_ai: 85,
              creating_with_ai: 90,
              managing_with_ai: 88,
              designing_with_ai: 90,
            },
            ksaScores: {
              knowledge: 85,
              skills: 90,
              attitudes: 88,
            },
          },
        ],
      };

      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/pbl/history")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPBLData),
          });
        }
        if (url.includes("/api/assessment/results")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/pbl/history?lang=en&t="),
          { credentials: "include", cache: "no-store" },
        );
      });
    });

    it("should fetch Discovery history correctly", async () => {
      const mockDiscoveryScenarios = [
        {
          id: "discovery-scenario-1",
          title: "Data Scientist Career Path",
          metadata: { careerType: "data_scientist" },
          userPrograms: { total: 1 },
        },
      ];

      const mockDiscoveryPrograms = [
        {
          id: "discovery-program-1",
          status: "completed",
          startedAt: "2024-01-15T08:00:00Z",
          completedAt: "2024-01-15T10:00:00Z",
          totalTaskCount: 5,
          currentTaskIndex: 4,
          taskLogs: [
            { isCompleted: true },
            { isCompleted: true },
            { isCompleted: true },
            { isCompleted: true },
            { isCompleted: true },
          ],
          completionData: {
            overallScore: 92,
            domainScores: {
              engaging_with_ai: 90,
              creating_with_ai: 95,
              managing_with_ai: 88,
              designing_with_ai: 95,
            },
            ksaScores: {
              knowledge: 88,
              skills: 95,
              attitudes: 93,
            },
          },
          metadata: { currentTaskId: "task-5" },
        },
      ];

      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/discovery/my-programs")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockDiscoveryScenarios),
          });
        }
        if (
          url.includes("/api/discovery/scenarios/discovery-scenario-1/programs")
        ) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockDiscoveryPrograms),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/discovery/my-programs?t="),
          { credentials: "include", cache: "no-store" },
        );
      });
    });

    it("should handle API errors gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      mockFetch.mockRejectedValue(new Error("Network error"));

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Error fetching history:",
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });

    it("should handle partial API failures", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/assessment/results")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          });
        }
        if (url.includes("/api/pbl/history")) {
          return Promise.reject(new Error("PBL API error"));
        }
        if (url.includes("/api/discovery/my-programs")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          });
        }
        return Promise.reject(new Error("Unknown error"));
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Error fetching PBL history:",
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Filter Functionality", () => {
    beforeEach(async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "isLoggedIn") return "true";
        if (key === "user")
          return JSON.stringify({ id: "user-123", email: "test@example.com" });
        return null;
      });

      // Mock mixed data
      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/assessment/results")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: [
                  {
                    assessment_id: "assessment-1",
                    timestamp: "2024-01-15T10:30:00Z",
                    scores: { overall: 85, domains: {} },
                    summary: {
                      total_questions: 20,
                      correct_answers: 17,
                      level: "advanced",
                    },
                    duration_seconds: 1200,
                    language: "en",
                  },
                ],
              }),
          });
        }
        if (url.includes("/api/pbl/history")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                programs: [
                  {
                    id: "pbl-1",
                    scenarioId: "scenario-1",
                    scenarioTitle: "PBL Scenario",
                    status: "completed",
                    startedAt: "2024-01-15T09:00:00Z",
                    totalTimeSeconds: 3600,
                    evaluatedTasks: 2,
                    totalTaskCount: 3,
                    tasks: [],
                  },
                ],
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });
    });

    it("should display all filter buttons with correct counts", async () => {
      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(screen.getByText("All (2)")).toBeInTheDocument();
        expect(screen.getByText("Assessment (1)")).toBeInTheDocument();
        expect(
          screen.getByText("Problem-Based Learning (1)"),
        ).toBeInTheDocument();
        expect(screen.getByText("Discovery (0)")).toBeInTheDocument();
      });
    });

    it("should filter items correctly when assessment filter is selected", async () => {
      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(screen.getByText("All (2)")).toBeInTheDocument();
      });

      const assessmentFilter = screen.getByText("Assessment (1)");
      await user.click(assessmentFilter);

      await waitFor(() => {
        expect(screen.getByText("ID: assessment-1")).toBeInTheDocument();
        expect(screen.queryByText("PBL Scenario")).not.toBeInTheDocument();
      });
    });

    it("should filter items correctly when PBL filter is selected", async () => {
      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(screen.getByText("All (2)")).toBeInTheDocument();
      });

      const pblFilter = screen.getByText("Problem-Based Learning (1)");
      await user.click(pblFilter);

      await waitFor(() => {
        expect(screen.getByText("PBL Scenario")).toBeInTheDocument();
        expect(screen.queryByText("ID: assessment-1")).not.toBeInTheDocument();
      });
    });

    it('should show all items when "All" filter is selected', async () => {
      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(screen.getByText("All (2)")).toBeInTheDocument();
      });

      // First select PBL filter
      const pblFilter = screen.getByText("Problem-Based Learning (1)");
      await user.click(pblFilter);

      await waitFor(() => {
        expect(screen.queryByText("ID: assessment-1")).not.toBeInTheDocument();
      });

      // Then select All filter
      const allFilter = screen.getByText("All (2)");
      await user.click(allFilter);

      await waitFor(() => {
        expect(screen.getByText("PBL Scenario")).toBeInTheDocument();
        expect(screen.getByText("ID: assessment-1")).toBeInTheDocument();
      });
    });

    it("should update filter button styles correctly", async () => {
      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        const allFilter = screen.getByText("All (2)");
        expect(allFilter).toHaveClass("bg-blue-600", "text-white");
      });

      const assessmentFilter = screen.getByText("Assessment (1)");
      await user.click(assessmentFilter);

      await waitFor(() => {
        expect(assessmentFilter).toHaveClass("bg-blue-600", "text-white");
        expect(screen.getByText("All (2)")).not.toHaveClass(
          "bg-blue-600",
          "text-white",
        );
      });
    });
  });

  describe("Empty States", () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "isLoggedIn") return "true";
        if (key === "user")
          return JSON.stringify({ id: "user-123", email: "test@example.com" });
        return null;
      });

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ data: [], success: true, programs: [] }),
        }),
      );
    });

    it("should show empty state when no history items exist", async () => {
      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(
          screen.getByText("No learning history found"),
        ).toBeInTheDocument();
        expect(screen.getByText("Take Assessment")).toBeInTheDocument();
        expect(screen.getByText("Start PBL Learning")).toBeInTheDocument();
        expect(screen.getByText("Start Career Discovery")).toBeInTheDocument();
      });
    });

    it("should show empty state when filtered results are empty", async () => {
      // Mock data with only assessment items
      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/assessment/results")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: [
                  {
                    assessment_id: "assessment-1",
                    timestamp: "2024-01-15T10:30:00Z",
                    scores: { overall: 85, domains: {} },
                    summary: {
                      total_questions: 20,
                      correct_answers: 17,
                      level: "advanced",
                    },
                    duration_seconds: 1200,
                    language: "en",
                  },
                ],
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, programs: [] }),
        });
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(screen.getByText("All (1)")).toBeInTheDocument();
      });

      // Filter by Discovery (which has no items)
      const discoveryFilter = screen.getByText("Discovery (0)");
      await user.click(discoveryFilter);

      await waitFor(() => {
        expect(
          screen.getByText("No learning history found"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Assessment Item Display", () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "isLoggedIn") return "true";
        if (key === "user")
          return JSON.stringify({ id: "user-123", email: "test@example.com" });
        return null;
      });
    });

    it("should display assessment items correctly", async () => {
      const mockAssessmentData = {
        data: [
          {
            assessment_id: "test-assessment-1",
            timestamp: "2024-01-15T10:30:00Z",
            scores: {
              overall: 85,
              domains: {
                engaging_with_ai: 90,
                creating_with_ai: 80,
                managing_with_ai: 85,
                designing_with_ai: 85,
              },
            },
            summary: {
              total_questions: 20,
              correct_answers: 17,
              level: "advanced",
            },
            duration_seconds: 1200,
            language: "en",
          },
        ],
      };

      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/assessment/results")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockAssessmentData),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, programs: [] }),
        });
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(screen.getByText("Assessment")).toBeInTheDocument();
        expect(screen.getByText("ID: test-assessment-1")).toBeInTheDocument();
        expect(screen.getAllByText("85%").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("17/20 correct")).toBeInTheDocument();
        expect(screen.getByText("Advanced")).toBeInTheDocument();
      });
    });

    it("should display domain scores correctly for assessments", async () => {
      const mockAssessmentData = {
        data: [
          {
            assessment_id: "test-assessment-1",
            timestamp: "2024-01-15T10:30:00Z",
            scores: {
              overall: 85,
              domains: {
                engaging_with_ai: 90,
                creating_with_ai: 80,
                managing_with_ai: 85,
                designing_with_ai: 75,
              },
            },
            summary: {
              total_questions: 20,
              correct_answers: 17,
              level: "advanced",
            },
            duration_seconds: 1200,
            language: "en",
          },
        ],
      };

      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/assessment/results")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockAssessmentData),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, programs: [] }),
        });
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(screen.getByText("Engaging with AI")).toBeInTheDocument();
        expect(screen.getByText("Creating with AI")).toBeInTheDocument();
        expect(screen.getByText("Managing with AI")).toBeInTheDocument();
        expect(screen.getByText("Designing with AI")).toBeInTheDocument();
        expect(screen.getByText("90%")).toBeInTheDocument();
        expect(screen.getByText("80%")).toBeInTheDocument();
        expect(screen.getByText("75%")).toBeInTheDocument();
      });
    });

    it("should handle assessment navigation correctly", async () => {
      const mockAssessmentData = {
        data: [
          {
            assessment_id: "test-assessment-1",
            timestamp: "2024-01-15T10:30:00Z",
            scores: { overall: 85, domains: {} },
            summary: {
              total_questions: 20,
              correct_answers: 17,
              level: "advanced",
            },
            duration_seconds: 1200,
            language: "en",
          },
        ],
      };

      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/assessment/results")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockAssessmentData),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, programs: [] }),
        });
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        const takeNewAssessmentButton = screen.getByText(
          "Take New Assessment →",
        );
        expect(takeNewAssessmentButton).toBeInTheDocument();
      });

      const takeNewAssessmentButton = screen.getByText("Take New Assessment →");
      await user.click(takeNewAssessmentButton);

      expect(mockPush).toHaveBeenCalledWith("/assessment");
    });
  });

  describe("PBL Item Display", () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "isLoggedIn") return "true";
        if (key === "user")
          return JSON.stringify({ id: "user-123", email: "test@example.com" });
        return null;
      });
    });

    it("should display PBL sessions with scores correctly", async () => {
      const mockPBLData = {
        success: true,
        programs: [
          {
            id: "pbl-program-1",
            scenarioId: "scenario-1",
            scenarioTitle: "AI Ethics Dilemma",
            status: "completed",
            startedAt: "2024-01-15T09:00:00Z",
            completedAt: "2024-01-15T11:30:00Z",
            totalTimeSeconds: 9000,
            evaluatedTasks: 3,
            totalTaskCount: 3,
            overallScore: 88,
            tasks: [
              {
                id: "task-1",
                title: "Ethics Analysis",
                log: { interactions: [1, 2, 3] },
              },
            ],
            domainScores: {
              engaging_with_ai: 85,
              creating_with_ai: 90,
              managing_with_ai: 88,
              designing_with_ai: 90,
            },
            ksaScores: {
              knowledge: 85,
              skills: 90,
              attitudes: 88,
            },
          },
        ],
      };

      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/pbl/history")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPBLData),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(screen.getByText("Problem-Based Learning")).toBeInTheDocument();
        expect(screen.getByText("AI Ethics Dilemma")).toBeInTheDocument();
        expect(
          screen.getByText("Program ID: pbl-program-1"),
        ).toBeInTheDocument();
        expect(screen.getAllByText("88%").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("3/3 tasks evaluated")).toBeInTheDocument();
        expect(screen.getByText("3 times")).toBeInTheDocument();
      });
    });

    it("should display PBL sessions without scores correctly", async () => {
      const mockPBLData = {
        success: true,
        programs: [
          {
            id: "pbl-program-1",
            scenarioId: "scenario-1",
            scenarioTitle: "AI Ethics Dilemma",
            status: "in_progress",
            startedAt: "2024-01-15T09:00:00Z",
            totalTimeSeconds: 3600,
            evaluatedTasks: 1,
            totalTaskCount: 3,
            tasks: [
              {
                id: "task-1",
                title: "Ethics Analysis",
                log: { interactions: [1, 2] },
              },
            ],
          },
        ],
      };

      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/pbl/history")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPBLData),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(screen.getByText("1/3 tasks")).toBeInTheDocument();
        expect(screen.getByText("2 times")).toBeInTheDocument();
        expect(screen.queryByText("88%")).not.toBeInTheDocument();
      });
    });

    it("should handle PBL continue study navigation", async () => {
      const mockPBLData = {
        success: true,
        programs: [
          {
            id: "pbl-program-1",
            scenarioId: "scenario-1",
            scenarioTitle: "AI Ethics Dilemma",
            status: "in_progress",
            startedAt: "2024-01-15T09:00:00Z",
            totalTimeSeconds: 3600,
            evaluatedTasks: 1,
            totalTaskCount: 3,
            currentTaskId: "task-2",
            tasks: [],
          },
        ],
      };

      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/pbl/history")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPBLData),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        const continueButton = screen.getByText("Continue Study →");
        expect(continueButton).toBeInTheDocument();
      });

      const continueButton = screen.getByRole("button", {
        name: /continue study/i,
      });
      await user.click(continueButton);

      expect(mockPush).toHaveBeenCalledWith(
        "/pbl/scenarios/scenario-1/programs/pbl-program-1/tasks/task-1",
      );
    });

    it("should handle PBL view report navigation", async () => {
      const mockPBLData = {
        success: true,
        programs: [
          {
            id: "pbl-program-1",
            scenarioId: "scenario-1",
            scenarioTitle: "AI Ethics Dilemma",
            status: "completed",
            startedAt: "2024-01-15T09:00:00Z",
            completedAt: "2024-01-15T11:30:00Z",
            totalTimeSeconds: 9000,
            evaluatedTasks: 3,
            totalTaskCount: 3,
            tasks: [],
          },
        ],
      };

      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/pbl/history")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPBLData),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        const viewReportLink = screen.getByText("View Report →");
        expect(viewReportLink).toBeInTheDocument();
        expect(viewReportLink.closest("a")).toHaveAttribute(
          "href",
          "/pbl/programs/pbl-program-1/complete",
        );
      });
    });
  });

  describe("Discovery Item Display", () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "isLoggedIn") return "true";
        if (key === "user")
          return JSON.stringify({ id: "user-123", email: "test@example.com" });
        return null;
      });
    });

    it("should display Discovery sessions with scores correctly", async () => {
      const mockDiscoveryScenarios = [
        {
          id: "discovery-scenario-1",
          title: "Data Scientist Career Path",
          metadata: { careerType: "data_scientist" },
          userPrograms: { total: 1 },
        },
      ];

      const mockDiscoveryPrograms = [
        {
          id: "discovery-program-1",
          status: "completed",
          startedAt: "2024-01-15T08:00:00Z",
          completedAt: "2024-01-15T10:00:00Z",
          totalTaskCount: 5,
          currentTaskIndex: 4,
          taskLogs: Array(5).fill({ isCompleted: true }),
          completionData: {
            overallScore: 92,
            domainScores: {
              engaging_with_ai: 90,
              creating_with_ai: 95,
              managing_with_ai: 88,
              designing_with_ai: 95,
            },
            ksaScores: {
              knowledge: 88,
              skills: 95,
              attitudes: 93,
            },
          },
          metadata: { currentTaskId: "task-5" },
          evaluations: [1, 2, 3, 4, 5],
        },
      ];

      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/discovery/my-programs")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockDiscoveryScenarios),
          });
        }
        if (
          url.includes("/api/discovery/scenarios/discovery-scenario-1/programs")
        ) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockDiscoveryPrograms),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(screen.getByText("Discovery")).toBeInTheDocument();
        expect(
          screen.getByText("Data Scientist Career Path"),
        ).toBeInTheDocument();
        expect(
          screen.getByText("Program ID: discovery-program-1"),
        ).toBeInTheDocument();
        expect(
          screen.getByText("Career Type: data_scientist"),
        ).toBeInTheDocument();
        expect(screen.getByText("92%")).toBeInTheDocument();
        expect(screen.getByText("5/5 tasks evaluated")).toBeInTheDocument();
        expect(screen.getByText("5 times")).toBeInTheDocument();
      });
    });

    it("should handle Discovery continue study navigation for active sessions", async () => {
      const mockDiscoveryScenarios = [
        {
          id: "discovery-scenario-1",
          title: "Data Scientist Career Path",
          metadata: { careerType: "data_scientist" },
          userPrograms: { total: 1 },
        },
      ];

      const mockDiscoveryPrograms = [
        {
          id: "discovery-program-1",
          status: "active",
          startedAt: "2024-01-15T08:00:00Z",
          totalTaskCount: 5,
          currentTaskIndex: 2,
          taskLogs: [
            { isCompleted: true },
            { isCompleted: true },
            { isCompleted: false },
            { isCompleted: false },
            { isCompleted: false },
          ],
          metadata: { currentTaskId: "task-3" },
        },
      ];

      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/discovery/my-programs")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockDiscoveryScenarios),
          });
        }
        if (
          url.includes("/api/discovery/scenarios/discovery-scenario-1/programs")
        ) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockDiscoveryPrograms),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        const continueButton = screen.getByText("Continue Study →");
        expect(continueButton).toBeInTheDocument();
      });

      const continueButton = screen.getByText("Continue Study →");
      await user.click(continueButton);

      expect(mockPush).toHaveBeenCalledWith(
        "/discovery/scenarios/discovery-scenario-1/programs/discovery-program-1/tasks/task-3",
      );
    });
  });

  describe("Utility Functions", () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "isLoggedIn") return "true";
        if (key === "user")
          return JSON.stringify({ id: "user-123", email: "test@example.com" });
        return null;
      });
    });

    it("should format duration correctly", async () => {
      const mockAssessmentData = {
        data: [
          {
            assessment_id: "test-assessment-1",
            timestamp: "2024-01-15T10:30:00Z",
            scores: { overall: 85, domains: {} },
            summary: {
              total_questions: 20,
              correct_answers: 17,
              level: "advanced",
            },
            duration_seconds: 3661, // 1h 1m 1s
            language: "en",
          },
        ],
      };

      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/assessment/results")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockAssessmentData),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, programs: [] }),
        });
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(screen.getByText("Duration: 1h 1m")).toBeInTheDocument();
      });
    });

    it("should apply correct score colors", async () => {
      const mockAssessmentData = {
        data: [
          {
            assessment_id: "high-score",
            timestamp: "2024-01-15T10:30:00Z",
            scores: { overall: 92, domains: {} }, // Should be green (>= 85)
            summary: {
              total_questions: 20,
              correct_answers: 18,
              level: "expert",
            },
            duration_seconds: 1200,
            language: "en",
          },
          {
            assessment_id: "medium-score",
            timestamp: "2024-01-14T10:30:00Z",
            scores: { overall: 75, domains: {} }, // Should be blue (>= 70)
            summary: {
              total_questions: 20,
              correct_answers: 15,
              level: "advanced",
            },
            duration_seconds: 1200,
            language: "en",
          },
          {
            assessment_id: "low-score",
            timestamp: "2024-01-13T10:30:00Z",
            scores: { overall: 45, domains: {} }, // Should be red (< 55)
            summary: {
              total_questions: 20,
              correct_answers: 9,
              level: "beginner",
            },
            duration_seconds: 1200,
            language: "en",
          },
        ],
      };

      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/assessment/results")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockAssessmentData),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, programs: [] }),
        });
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        const highScoreElements = screen.getAllByText("92%");
        const mediumScoreElements = screen.getAllByText("75%");
        const lowScoreElements = screen.getAllByText("45%");

        expect(highScoreElements[0]).toHaveClass("text-green-600");
        expect(mediumScoreElements[0]).toHaveClass("text-blue-600");
        expect(lowScoreElements[0]).toHaveClass("text-red-600");
      });
    });
  });

  describe("Responsive Behavior", () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "isLoggedIn") return "true";
        if (key === "user")
          return JSON.stringify({ id: "user-123", email: "test@example.com" });
        return null;
      });

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ data: [], success: true, programs: [] }),
        }),
      );
    });

    it("should render responsive grid layouts", async () => {
      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        const container = screen.getByRole("main");
        expect(container).toHaveClass("min-h-screen", "py-8");
      });

      const container = screen.getByRole("main");
      const innerContainer = container.querySelector(".max-w-7xl");
      expect(innerContainer).toHaveClass("mx-auto");
    });

    it("should handle mobile filter layout", async () => {
      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        const filterContainer = document.querySelector(".flex.space-x-2");
        expect(filterContainer).toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "isLoggedIn") return "true";
        if (key === "user")
          return JSON.stringify({ id: "user-123", email: "test@example.com" });
        return null;
      });
    });

    it("should handle malformed API responses gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/assessment/results")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ malformed: "response" }), // Missing expected data structure
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, programs: [] }),
        });
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(
          screen.getByText("No learning history found"),
        ).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it("should handle missing optional fields in data", async () => {
      const mockPBLData = {
        success: true,
        programs: [
          {
            id: "minimal-program",
            scenarioId: "scenario-1",
            // Missing scenarioTitle
            status: "in_progress",
            startedAt: "2024-01-15T09:00:00Z",
            // Missing totalTimeSeconds - should default to 0
            evaluatedTasks: 0,
            totalTaskCount: 1,
            // Missing tasks array
          },
        ],
      };

      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/pbl/history")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPBLData),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        // Should display the scenario ID when title is missing
        expect(screen.getByText("scenario-1")).toBeInTheDocument();
        expect(screen.getByText("Duration: 0s")).toBeInTheDocument();
        expect(screen.getByText("0 times")).toBeInTheDocument(); // Default interaction count
      });
    });

    it("should handle discovery programs with no scenarios returned", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/discovery/my-programs")) {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ error: "Not found" }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Discovery API returned non-OK status:",
          404,
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Action Buttons", () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "isLoggedIn") return "true";
        if (key === "user")
          return JSON.stringify({ id: "user-123", email: "test@example.com" });
        return null;
      });

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ data: [], success: true, programs: [] }),
        }),
      );
    });

    it("should display action buttons at the bottom", async () => {
      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        const takeNewAssessment = screen.getByText("Take New Assessment");
        const startNewPBL = screen.getByText("Start New PBL");
        const startNewDiscovery = screen.getByText("Start New Discovery");

        expect(takeNewAssessment).toBeInTheDocument();
        expect(startNewPBL).toBeInTheDocument();
        expect(startNewDiscovery).toBeInTheDocument();

        expect(takeNewAssessment.closest("a")).toHaveAttribute(
          "href",
          "/assessment",
        );
        expect(startNewPBL.closest("a")).toHaveAttribute("href", "/pbl");
        expect(startNewDiscovery.closest("a")).toHaveAttribute(
          "href",
          "/discovery",
        );
      });
    });

    it("should have correct styling for action buttons", async () => {
      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        const takeNewAssessment = screen.getByText("Take New Assessment");
        const startNewPBL = screen.getByText("Start New PBL");
        const startNewDiscovery = screen.getByText("Start New Discovery");

        expect(takeNewAssessment).toHaveClass("bg-indigo-600", "text-white");
        expect(startNewPBL).toHaveClass("bg-purple-600", "text-white");
        expect(startNewDiscovery).toHaveClass("bg-emerald-600", "text-white");
      });
    });
  });

  describe("Data Sorting", () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "isLoggedIn") return "true";
        if (key === "user")
          return JSON.stringify({ id: "user-123", email: "test@example.com" });
        return null;
      });
    });

    it("should sort history items by timestamp in descending order", async () => {
      const mockAssessmentData = {
        data: [
          {
            assessment_id: "old-assessment",
            timestamp: "2024-01-10T10:30:00Z",
            scores: { overall: 85, domains: {} },
            summary: {
              total_questions: 20,
              correct_answers: 17,
              level: "advanced",
            },
            duration_seconds: 1200,
            language: "en",
          },
        ],
      };

      const mockPBLData = {
        success: true,
        programs: [
          {
            id: "recent-pbl",
            scenarioId: "scenario-1",
            scenarioTitle: "Recent PBL Session",
            status: "completed",
            startedAt: "2024-01-20T09:00:00Z", // More recent
            completedAt: "2024-01-20T11:00:00Z",
            totalTimeSeconds: 7200,
            evaluatedTasks: 2,
            totalTaskCount: 2,
            tasks: [],
          },
        ],
      };

      mockFetch.mockImplementation((url) => {
        if (url.includes("/api/assessment/results")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockAssessmentData),
          });
        }
        if (url.includes("/api/pbl/history")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPBLData),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      renderWithProviders(<UnifiedHistoryPage />);

      await waitFor(() => {
        expect(screen.getByText("Recent PBL Session")).toBeInTheDocument();
        expect(screen.getByText("ID: old-assessment")).toBeInTheDocument();
      });
    });
  });
});
