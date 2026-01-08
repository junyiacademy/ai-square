import React from "react";
import {
  renderWithProviders,
  screen,
  waitFor,
  fireEvent,
} from "@/test-utils/helpers/render";
import QuestionReview from "../QuestionReview";
import { AssessmentQuestion, UserAnswer } from "../../../types/assessment";

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        "results.questionReview.title": "Question Review",
        "results.questionReview.noQuestions": "No questions selected",
        "results.questionReview.questionNumber": `Question ${options?.current} of ${options?.total}`,
        "results.questionReview.previous": "Previous",
        "results.questionReview.next": "Next",
        "results.questionReview.correct": "Correct",
        "results.questionReview.incorrect": "Incorrect",
        "results.questionReview.practicePrompt": "Want to practice more?",
        "results.questionReview.closeReview": "Close Review",
        "difficulty.basic": "Basic",
        "difficulty.intermediate": "Intermediate",
        "difficulty.advanced": "Advanced",
        "domains.engaging_with_ai": "Engaging with AI",
        "domains.creating_with_ai": "Creating with AI",
        "quiz.explanation": "Explanation",
        "quiz.ksaMapping": "Related Competencies",
        "quiz.knowledge": "Knowledge",
        "quiz.skills": "Skills",
        "quiz.attitudes": "Attitudes",
      };
      return translations[key] || key;
    },
  }),
}));

// Mock window.location
delete (window as any).location;
window.location = { href: "" } as any;

const mockQuestions: AssessmentQuestion[] = [
  {
    id: "q1",
    type: "multiple_choice",
    question: "What is AI?",
    options: {
      a: "Artificial Intelligence",
      b: "Automated Intelligence",
      c: "Advanced Intelligence",
      d: "Assisted Intelligence",
    },
    correct_answer: "a",
    difficulty: "basic",
    domain: "engaging_with_ai",
    explanation: "AI stands for Artificial Intelligence.",
    ksa_mapping: {
      knowledge: ["K1.1"],
      skills: ["S1.1"],
      attitudes: ["A1.1"],
    },
  },
  {
    id: "q2",
    type: "multiple_choice",
    question: "How does machine learning work?",
    options: {
      a: "Pre-programmed rules",
      b: "Learning from data",
      c: "Random generation",
      d: "Human instruction",
    },
    correct_answer: "b",
    difficulty: "intermediate",
    domain: "creating_with_ai",
    explanation: "Machine learning involves algorithms learning from data.",
    ksa_mapping: {
      knowledge: ["K2.1"],
      skills: [],
      attitudes: [],
    },
  },
  {
    id: "q3",
    type: "multiple_choice",
    question: "What are AI ethics?",
    options: {
      a: "Technical standards",
      b: "Moral principles",
      c: "Legal requirements",
      d: "Business rules",
    },
    correct_answer: "b",
    difficulty: "advanced",
    domain: "engaging_with_ai",
    explanation: "AI ethics refers to moral principles guiding AI development.",
    ksa_mapping: {
      knowledge: [],
      skills: [],
      attitudes: [],
    },
  },
];

const mockUserAnswers: UserAnswer[] = [
  {
    questionId: "q1",
    selectedAnswer: "a",
    isCorrect: true,
    timeSpent: 5000,
  },
  {
    questionId: "q2",
    selectedAnswer: "a",
    isCorrect: false,
    timeSpent: 8000,
  },
];

describe("QuestionReview", () => {
  const defaultProps = {
    questions: mockQuestions,
    userAnswers: mockUserAnswers,
    selectedQuestionIds: ["q1", "q2"],
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders question review with title", async () => {
    renderWithProviders(<QuestionReview {...defaultProps} />);

    expect(screen.getByText("Question Review")).toBeInTheDocument();
  });

  it("shows no questions message when no questions selected", async () => {
    renderWithProviders(
      <QuestionReview {...defaultProps} selectedQuestionIds={[]} />,
    );

    expect(screen.getByText("No questions selected")).toBeInTheDocument();
  });

  it("renders first question by default", async () => {
    renderWithProviders(<QuestionReview {...defaultProps} />);

    expect(screen.getByText("What is AI?")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
  });

  it("displays question difficulty and domain", async () => {
    renderWithProviders(<QuestionReview {...defaultProps} />);

    expect(screen.getByText("Basic")).toBeInTheDocument();
    expect(screen.getByText("Engaging with AI")).toBeInTheDocument();
  });

  it("renders all answer options", async () => {
    renderWithProviders(<QuestionReview {...defaultProps} />);

    expect(screen.getByText("A.")).toBeInTheDocument();
    expect(screen.getByText("Artificial Intelligence")).toBeInTheDocument();
    expect(screen.getByText("B.")).toBeInTheDocument();
    expect(screen.getByText("Automated Intelligence")).toBeInTheDocument();
    expect(screen.getByText("C.")).toBeInTheDocument();
    expect(screen.getByText("Advanced Intelligence")).toBeInTheDocument();
    expect(screen.getByText("D.")).toBeInTheDocument();
    expect(screen.getByText("Assisted Intelligence")).toBeInTheDocument();
  });

  it("highlights correct answer with green styling", async () => {
    renderWithProviders(<QuestionReview {...defaultProps} />);

    // Find the parent container with the styling
    const correctOption = screen
      .getByText("Artificial Intelligence")
      .closest(".border-green-500");
    expect(correctOption).toHaveClass("border-green-500", "bg-green-50");
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("shows user answer status for correct answer", async () => {
    renderWithProviders(<QuestionReview {...defaultProps} />);

    expect(screen.getByText("Correct")).toBeInTheDocument();
  });

  it("highlights incorrect answer with red styling", async () => {
    renderWithProviders(<QuestionReview {...defaultProps} />);

    // Navigate to second question with incorrect answer
    fireEvent.click(screen.getByText("Next"));

    const incorrectOption = screen
      .getByText("Pre-programmed rules")
      .closest(".border-red-500");
    expect(incorrectOption).toHaveClass("border-red-500", "bg-red-50");
    expect(screen.getByText("✗")).toBeInTheDocument();
  });

  it("shows incorrect status for wrong answer", async () => {
    renderWithProviders(<QuestionReview {...defaultProps} />);

    // Navigate to second question
    fireEvent.click(screen.getByText("Next"));

    expect(screen.getByText("Incorrect")).toBeInTheDocument();
  });

  it("navigates between questions using next/previous buttons", async () => {
    renderWithProviders(<QuestionReview {...defaultProps} />);

    // Initially on first question
    expect(screen.getByText("What is AI?")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();

    // Navigate to second question
    fireEvent.click(screen.getByText("Next"));
    expect(
      screen.getByText("How does machine learning work?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();

    // Navigate back to first question
    fireEvent.click(screen.getByText("Previous"));
    expect(screen.getByText("What is AI?")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
  });

  it("disables previous button on first question", async () => {
    renderWithProviders(<QuestionReview {...defaultProps} />);

    const previousButton = screen.getByText("Previous");
    expect(previousButton).toBeDisabled();
    expect(previousButton).toHaveClass(
      "disabled:opacity-50",
      "disabled:cursor-not-allowed",
    );
  });

  it("disables next button on last question", async () => {
    renderWithProviders(<QuestionReview {...defaultProps} />);

    // Navigate to last question
    fireEvent.click(screen.getByText("Next"));

    const nextButton = screen.getByText("Next");
    expect(nextButton).toBeDisabled();
    expect(nextButton).toHaveClass(
      "disabled:opacity-50",
      "disabled:cursor-not-allowed",
    );
  });

  it("displays explanation for question", async () => {
    renderWithProviders(<QuestionReview {...defaultProps} />);

    expect(screen.getByText("Explanation")).toBeInTheDocument();
    expect(
      screen.getByText("AI stands for Artificial Intelligence."),
    ).toBeInTheDocument();
  });

  it("displays KSA mapping when available", async () => {
    renderWithProviders(<QuestionReview {...defaultProps} />);

    expect(screen.getByText("Related Competencies")).toBeInTheDocument();
    expect(screen.getByText("Knowledge:")).toBeInTheDocument();
    expect(screen.getByText("K1.1")).toBeInTheDocument();
    expect(screen.getByText("Skills:")).toBeInTheDocument();
    expect(screen.getByText("S1.1")).toBeInTheDocument();
    expect(screen.getByText("Attitudes:")).toBeInTheDocument();
    expect(screen.getByText("A1.1")).toBeInTheDocument();
  });

  it("handles empty KSA arrays", async () => {
    renderWithProviders(<QuestionReview {...defaultProps} />);

    // Navigate to second question with empty skills and attitudes
    fireEvent.click(screen.getByText("Next"));

    expect(screen.getByText("Knowledge:")).toBeInTheDocument();
    expect(screen.getByText("K2.1")).toBeInTheDocument();
    // Should not show empty skills and attitudes sections
    expect(screen.queryByText("Skills:")).not.toBeInTheDocument();
    expect(screen.queryByText("Attitudes:")).not.toBeInTheDocument();
  });

  it("displays KSA mapping section even with empty arrays", async () => {
    renderWithProviders(
      <QuestionReview {...defaultProps} selectedQuestionIds={["q3"]} />,
    );

    // The component shows the section if ksa_mapping exists, even if all arrays are empty
    expect(screen.getByText("Related Competencies")).toBeInTheDocument();

    // But it shouldn't show any category labels when arrays are empty
    expect(screen.queryByText("Knowledge:")).not.toBeInTheDocument();
    expect(screen.queryByText("Skills:")).not.toBeInTheDocument();
    expect(screen.queryByText("Attitudes:")).not.toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const onCloseMock = jest.fn();
    renderWithProviders(
      <QuestionReview {...defaultProps} onClose={onCloseMock} />,
    );

    const closeButton = screen.getByRole("button", { name: "" }); // SVG close button
    fireEvent.click(closeButton);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close review button is clicked", async () => {
    const onCloseMock = jest.fn();
    renderWithProviders(
      <QuestionReview {...defaultProps} onClose={onCloseMock} />,
    );

    const closeReviewButton = screen.getByText("Close Review");
    fireEvent.click(closeReviewButton);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("displays correct difficulty styling", async () => {
    renderWithProviders(
      <QuestionReview
        {...defaultProps}
        selectedQuestionIds={["q1", "q2", "q3"]}
      />,
    );

    // Basic difficulty (green)
    expect(screen.getByText("Basic")).toHaveClass(
      "bg-green-100",
      "text-green-800",
    );

    // Navigate to intermediate
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Intermediate")).toHaveClass(
      "bg-yellow-100",
      "text-yellow-800",
    );

    // Navigate to advanced
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Advanced")).toHaveClass(
      "bg-red-100",
      "text-red-800",
    );
  });

  it("handles questions without user answers", async () => {
    const propsWithoutAnswers = {
      ...defaultProps,
      userAnswers: [],
      selectedQuestionIds: ["q1"],
    };

    renderWithProviders(<QuestionReview {...propsWithoutAnswers} />);

    // Should not show answer status
    expect(screen.queryByText("Correct")).not.toBeInTheDocument();
    expect(screen.queryByText("Incorrect")).not.toBeInTheDocument();

    // Check that icons are not shown
    expect(screen.queryByText("✓")).not.toBeInTheDocument();
    expect(screen.queryByText("✗")).not.toBeInTheDocument();
  });

  it("filters questions correctly based on selectedQuestionIds", async () => {
    renderWithProviders(
      <QuestionReview {...defaultProps} selectedQuestionIds={["q2"]} />,
    );

    expect(
      screen.getByText("How does machine learning work?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 1")).toBeInTheDocument();

    // Next button should be disabled since there's only one question
    expect(screen.getByText("Next")).toBeDisabled();
  });

  it("renders practice section at the bottom", async () => {
    renderWithProviders(<QuestionReview {...defaultProps} />);

    expect(screen.getByText("Want to practice more?")).toBeInTheDocument();
    expect(screen.getByText("Close Review")).toBeInTheDocument();
  });

  it("maintains state when navigating between questions", async () => {
    renderWithProviders(<QuestionReview {...defaultProps} />);

    // Navigate to second question
    fireEvent.click(screen.getByText("Next"));
    expect(
      screen.getByText("How does machine learning work?"),
    ).toBeInTheDocument();

    // Navigate back to first
    fireEvent.click(screen.getByText("Previous"));
    expect(screen.getByText("What is AI?")).toBeInTheDocument();

    // Navigate forward again
    fireEvent.click(screen.getByText("Next"));
    expect(
      screen.getByText("How does machine learning work?"),
    ).toBeInTheDocument();
  });
});
