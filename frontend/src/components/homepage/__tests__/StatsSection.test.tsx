import React from "react";
import { render, screen } from "@testing-library/react";
import StatsSection from "../StatsSection";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn(), language: "en" },
  }),
}));

describe("StatsSection", () => {
  it("renders all four stats", () => {
    render(<StatsSection />);
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("20+")).toBeInTheDocument();
    expect(screen.getByText("24/7")).toBeInTheDocument();
  });

  it("renders stat labels", () => {
    render(<StatsSection />);
    expect(screen.getByText("stats.languages")).toBeInTheDocument();
    expect(screen.getByText("stats.domains")).toBeInTheDocument();
    expect(screen.getByText("stats.competencies")).toBeInTheDocument();
    expect(screen.getByText("stats.aiSupport")).toBeInTheDocument();
  });

  it("renders Lucide icons", () => {
    const { container } = render(<StatsSection />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(4);
  });
});
