import React from "react";
import { render, screen } from "@testing-library/react";
import Home from "../page";

jest.mock("@/components/homepage/HeroSection", () => {
  return function MockHeroSection() {
    return <div data-testid="hero-section">Hero Section</div>;
  };
});

jest.mock("@/components/homepage/StatsSection", () => {
  return function MockStatsSection() {
    return <div data-testid="stats-section">Stats Section</div>;
  };
});

jest.mock("@/components/homepage/ModesSection", () => {
  return function MockModesSection() {
    return <div data-testid="modes-section">Modes Section</div>;
  };
});

jest.mock("@/components/homepage/HowItWorksSection", () => {
  return function MockHowItWorksSection() {
    return <div data-testid="how-it-works-section">How It Works Section</div>;
  };
});

jest.mock("@/components/homepage/DomainsSection", () => {
  return function MockDomainsSection() {
    return <div data-testid="domains-section">Domains Section</div>;
  };
});

jest.mock("@/components/homepage/CTASection", () => {
  return function MockCTASection() {
    return <div data-testid="cta-section">CTA Section</div>;
  };
});

describe("Home Page", () => {
  it("renders all homepage sections", () => {
    render(<Home />);

    expect(screen.getByTestId("hero-section")).toBeInTheDocument();
    expect(screen.getByTestId("stats-section")).toBeInTheDocument();
    expect(screen.getByTestId("modes-section")).toBeInTheDocument();
    expect(screen.getByTestId("how-it-works-section")).toBeInTheDocument();
    expect(screen.getByTestId("domains-section")).toBeInTheDocument();
    expect(screen.getByTestId("cta-section")).toBeInTheDocument();
  });

  it("renders with correct layout structure", () => {
    const { container } = render(<Home />);
    const main = container.querySelector("main");
    expect(main).toHaveClass("min-h-screen");
  });

  it("renders sections in the correct order", () => {
    render(<Home />);

    const sections = screen.getAllByTestId(/section$/);
    const sectionIds = sections.map((s) => s.getAttribute("data-testid"));

    expect(sectionIds).toEqual([
      "hero-section",
      "stats-section",
      "modes-section",
      "how-it-works-section",
      "domains-section",
      "cta-section",
    ]);
  });
});
