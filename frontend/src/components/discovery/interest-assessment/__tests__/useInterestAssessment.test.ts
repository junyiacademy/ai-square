import { renderHook, act, waitFor } from "@testing-library/react";
import { useInterestAssessment } from "../useInterestAssessment";
import type { Question } from "../types";

describe("useInterestAssessment", () => {
  const mockQuestions: Question[] = [
    {
      id: "q1",
      text: "Question 1",
      options: [
        {
          id: "q1-opt1",
          text: "Option 1",
          weight: { tech: 1, creative: 0, business: 0 },
        },
        {
          id: "q1-opt2",
          text: "Option 2",
          weight: { tech: 0, creative: 1, business: 0 },
        },
      ],
    },
    {
      id: "q2",
      text: "Question 2",
      options: [
        {
          id: "q2-opt1",
          text: "Option 1",
          weight: { tech: 0, creative: 0, business: 1 },
        },
        {
          id: "q2-opt2",
          text: "Option 2",
          weight: { tech: 1, creative: 0, business: 0 },
        },
      ],
    },
  ];

  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with first question", () => {
    const { result } = renderHook(() =>
      useInterestAssessment({
        questions: mockQuestions,
        onComplete: mockOnComplete,
      }),
    );

    expect(result.current.currentQuestionIndex).toBe(0);
    expect(result.current.currentQuestion).toEqual(mockQuestions[0]);
    expect(result.current.totalQuestions).toBe(2);
    expect(result.current.isLastQuestion).toBe(false);
  });

  it("should handle option selection", () => {
    const { result } = renderHook(() =>
      useInterestAssessment({
        questions: mockQuestions,
        onComplete: mockOnComplete,
      }),
    );

    act(() => {
      result.current.handleOptionSelect("q1-opt1");
    });

    expect(result.current.selectedOptions).toContain("q1-opt1");
    expect(result.current.canGoNext).toBe(true);
  });

  it("should toggle option deselection", () => {
    const { result } = renderHook(() =>
      useInterestAssessment({
        questions: mockQuestions,
        onComplete: mockOnComplete,
      }),
    );

    act(() => {
      result.current.handleOptionSelect("q1-opt1");
    });

    expect(result.current.selectedOptions).toContain("q1-opt1");

    act(() => {
      result.current.handleOptionSelect("q1-opt1");
    });

    expect(result.current.selectedOptions).not.toContain("q1-opt1");
  });

  it("should navigate to next question", async () => {
    const { result } = renderHook(() =>
      useInterestAssessment({
        questions: mockQuestions,
        onComplete: mockOnComplete,
      }),
    );

    act(() => {
      result.current.handleOptionSelect("q1-opt1");
    });

    act(() => {
      result.current.handleNext();
    });

    await waitFor(
      () => {
        expect(result.current.currentQuestionIndex).toBe(1);
      },
      { timeout: 500 },
    );
  });

  it("should navigate to previous question", async () => {
    const { result } = renderHook(() =>
      useInterestAssessment({
        questions: mockQuestions,
        onComplete: mockOnComplete,
      }),
    );

    // Move to second question
    act(() => {
      result.current.handleOptionSelect("q1-opt1");
    });

    act(() => {
      result.current.handleNext();
    });

    await waitFor(() => {
      expect(result.current.currentQuestionIndex).toBe(1);
    });

    // Go back
    act(() => {
      result.current.handlePrevious();
    });

    await waitFor(() => {
      expect(result.current.currentQuestionIndex).toBe(0);
    });
  });

  it("should calculate and return results on completion", async () => {
    const { result } = renderHook(() =>
      useInterestAssessment({
        questions: mockQuestions,
        onComplete: mockOnComplete,
      }),
    );

    // Answer first question (tech)
    act(() => {
      result.current.handleOptionSelect("q1-opt1");
    });

    act(() => {
      result.current.handleNext();
    });

    await waitFor(() => {
      expect(result.current.currentQuestionIndex).toBe(1);
    });

    // Answer second question (business)
    act(() => {
      result.current.handleOptionSelect("q2-opt1");
    });

    act(() => {
      result.current.handleNext();
    });

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it("should disable next when no option selected", () => {
    const { result } = renderHook(() =>
      useInterestAssessment({
        questions: mockQuestions,
        onComplete: mockOnComplete,
      }),
    );

    expect(result.current.canGoNext).toBe(false);
  });

  it("should disable previous on first question", () => {
    const { result } = renderHook(() =>
      useInterestAssessment({
        questions: mockQuestions,
        onComplete: mockOnComplete,
      }),
    );

    expect(result.current.canGoPrevious).toBe(false);
  });

  it("should preserve answers when navigating back", async () => {
    const { result } = renderHook(() =>
      useInterestAssessment({
        questions: mockQuestions,
        onComplete: mockOnComplete,
      }),
    );

    // Answer first question
    act(() => {
      result.current.handleOptionSelect("q1-opt1");
    });

    const firstAnswer = result.current.selectedOptions;

    // Move forward
    act(() => {
      result.current.handleNext();
    });

    await waitFor(() => {
      expect(result.current.currentQuestionIndex).toBe(1);
    });

    // Move back
    act(() => {
      result.current.handlePrevious();
    });

    await waitFor(() => {
      expect(result.current.selectedOptions).toEqual(firstAnswer);
    });
  });
});
