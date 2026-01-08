import React from "react";
import { render, screen } from "@testing-library/react";
import { ProgressIndicator } from "../ProgressIndicator";

describe("ProgressIndicator", () => {
  it("should render correct progress percentage", () => {
    render(<ProgressIndicator currentQuestion={0} totalQuestions={5} />);
    expect(screen.getByText("20%")).toBeInTheDocument();
  });

  it("should render current question number", () => {
    render(<ProgressIndicator currentQuestion={2} totalQuestions={5} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should render correct progress at 100%", () => {
    render(<ProgressIndicator currentQuestion={4} totalQuestions={5} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("should render milestone indicators", () => {
    const { container } = render(
      <ProgressIndicator currentQuestion={2} totalQuestions={5} />,
    );
    const milestones = container.querySelectorAll(".w-4.h-4.rounded-full");
    expect(milestones.length).toBe(5);
  });
});
