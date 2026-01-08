import { render, screen } from "@testing-library/react";
import { ScoreCardsGrid } from "../ScoreCardsGrid";
import type { CompletionData } from "@/types/pbl-completion";

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key.includes("complete.rating.perfect")) return "Perfect";
      if (key.includes("complete.rating.great")) return "Great";
      if (key.includes("complete.rating.good")) return "Good";
      if (key.includes("complete.overallScore")) return "Overall Score";
      if (key.includes("complete.domainScores")) return "Domain Scores";
      if (key.includes("complete.ksaSummary")) return "KSA Summary";
      if (key.includes("history.tasksEvaluated")) return "tasks evaluated";
      if (key.includes("complete.conversationCount")) return "Conversations";
      if (key.includes("complete.totalTimeSpent")) return "Time Spent";
      if (key.includes("history.times")) return "times";
      if (key.includes("complete.knowledge")) return "Knowledge";
      if (key.includes("complete.skills")) return "Skills";
      if (key.includes("complete.attitudes")) return "Attitudes";
      if (key.includes("domains.engaging_with_ai")) return "Engaging with AI";
      return key;
    },
  }),
}));

// Mock StarRating component
jest.mock("@/components/shared/StarRating", () => ({
  StarRating: ({ score }: { score: number }) => (
    <div data-testid="star-rating">{score} stars</div>
  ),
}));

describe("ScoreCardsGrid", () => {
  const mockFormatDuration = (seconds: number) => `${seconds}s`;

  const mockCompletionData: CompletionData = {
    programId: "test-program",
    scenarioId: "test-scenario",
    overallScore: 95,
    evaluatedTasks: 3,
    totalTasks: 3,
    totalTimeSeconds: 1200,
    domainScores: {
      engaging_with_ai: 4,
      creating_with_ai: 5,
      managing_with_ai: 3,
      designing_with_ai: 4,
    },
    ksaScores: {
      knowledge: 4,
      skills: 5,
      attitudes: 4,
    },
    tasks: [
      {
        taskId: "task-1",
        log: {
          interactions: [
            { type: "user", message: "Test message", timestamp: "2024-01-01" },
          ],
        },
      },
    ],
  } as CompletionData;

  it("renders all three score cards", () => {
    render(
      <ScoreCardsGrid
        completionData={mockCompletionData}
        formatDuration={mockFormatDuration}
      />,
    );
    expect(screen.getByText("Overall Score")).toBeInTheDocument();
    expect(screen.getByText("Domain Scores")).toBeInTheDocument();
    expect(screen.getByText("KSA Summary")).toBeInTheDocument();
  });

  it("displays perfect rating for score >= 91", () => {
    render(
      <ScoreCardsGrid
        completionData={{ ...mockCompletionData, overallScore: 95 }}
        formatDuration={mockFormatDuration}
      />,
    );
    expect(screen.getByText("Perfect")).toBeInTheDocument();
  });

  it("displays great rating for score >= 71 and < 91", () => {
    render(
      <ScoreCardsGrid
        completionData={{ ...mockCompletionData, overallScore: 85 }}
        formatDuration={mockFormatDuration}
      />,
    );
    expect(screen.getByText("Great")).toBeInTheDocument();
  });

  it("displays good rating for score < 71", () => {
    render(
      <ScoreCardsGrid
        completionData={{ ...mockCompletionData, overallScore: 65 }}
        formatDuration={mockFormatDuration}
      />,
    );
    expect(screen.getByText("Good")).toBeInTheDocument();
  });

  it("shows task evaluation count", () => {
    render(
      <ScoreCardsGrid
        completionData={mockCompletionData}
        formatDuration={mockFormatDuration}
      />,
    );
    expect(screen.getByText(/3\/3/)).toBeInTheDocument();
  });

  it("calculates and displays conversation count", () => {
    render(
      <ScoreCardsGrid
        completionData={mockCompletionData}
        formatDuration={mockFormatDuration}
      />,
    );
    expect(screen.getByText(/1 times/)).toBeInTheDocument();
  });

  it("formats and displays time spent", () => {
    render(
      <ScoreCardsGrid
        completionData={mockCompletionData}
        formatDuration={mockFormatDuration}
      />,
    );
    expect(screen.getByText("1200s")).toBeInTheDocument();
  });

  it("renders domain scores with star ratings", () => {
    render(
      <ScoreCardsGrid
        completionData={mockCompletionData}
        formatDuration={mockFormatDuration}
      />,
    );
    expect(screen.getByText("Engaging with AI")).toBeInTheDocument();
    const starRatings = screen.getAllByTestId("star-rating");
    expect(starRatings.length).toBeGreaterThan(0);
  });

  it("renders KSA scores", () => {
    render(
      <ScoreCardsGrid
        completionData={mockCompletionData}
        formatDuration={mockFormatDuration}
      />,
    );
    expect(screen.getByText("Knowledge")).toBeInTheDocument();
    expect(screen.getByText("Skills")).toBeInTheDocument();
    expect(screen.getByText("Attitudes")).toBeInTheDocument();
  });

  it("handles missing domain scores gracefully", () => {
    const dataWithoutDomains = {
      ...mockCompletionData,
      domainScores: undefined,
    };
    const { container } = render(
      <ScoreCardsGrid
        completionData={dataWithoutDomains}
        formatDuration={mockFormatDuration}
      />,
    );
    expect(container).toBeInTheDocument();
  });

  it("handles missing KSA scores gracefully", () => {
    const dataWithoutKSA = { ...mockCompletionData, ksaScores: undefined };
    const { container } = render(
      <ScoreCardsGrid
        completionData={dataWithoutKSA}
        formatDuration={mockFormatDuration}
      />,
    );
    expect(container).toBeInTheDocument();
  });
});
