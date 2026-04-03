import React from "react";
import { render, screen } from "@testing-library/react";
import HowItWorksSection from "../HowItWorksSection";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "howItWorks.title": "How It Works",
        "howItWorks.subtitle": "Start learning in three simple steps",
        "howItWorks.steps.assess.title": "Assess",
        "howItWorks.steps.assess.description": "Take a quick assessment",
        "howItWorks.steps.learn.title": "Learn",
        "howItWorks.steps.learn.description": "Follow personalized paths",
        "howItWorks.steps.grow.title": "Grow",
        "howItWorks.steps.grow.description": "Track your progress",
      };
      return translations[key] || key;
    },
  }),
}));

describe("HowItWorksSection", () => {
  it("renders section title and subtitle", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText("How It Works")).toBeInTheDocument();
    expect(screen.getByText("Start learning in three simple steps")).toBeInTheDocument();
  });

  it("renders three steps", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText("Assess")).toBeInTheDocument();
    expect(screen.getByText("Learn")).toBeInTheDocument();
    expect(screen.getByText("Grow")).toBeInTheDocument();
  });

  it("renders step descriptions", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText("Take a quick assessment")).toBeInTheDocument();
    expect(screen.getByText("Follow personalized paths")).toBeInTheDocument();
    expect(screen.getByText("Track your progress")).toBeInTheDocument();
  });

  it("renders step numbers", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });

  it("renders Lucide icons", () => {
    const { container } = render(<HowItWorksSection />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(3);
  });

  it("uses responsive grid layout", () => {
    const { container } = render(<HowItWorksSection />);
    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("grid-cols-1", "md:grid-cols-3");
  });
});
