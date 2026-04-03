import React from "react";
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

jest.mock("@/components/homepage/HeroSection", () => ({
  __esModule: true,
  default: () => <div data-testid="hero-section">Hero Section</div>,
}));

jest.mock("@/components/homepage/StatsSection", () => ({
  __esModule: true,
  default: () => <div data-testid="stats-section">Stats Section</div>,
}));

jest.mock("@/components/homepage/ModesSection", () => ({
  __esModule: true,
  default: () => <div data-testid="modes-section">Modes Section</div>,
}));

jest.mock("@/components/homepage/HowItWorksSection", () => ({
  __esModule: true,
  default: () => <div data-testid="how-it-works-section">How It Works</div>,
}));

jest.mock("@/components/homepage/DomainsSection", () => ({
  __esModule: true,
  default: () => <div data-testid="domains-section">Domains</div>,
}));

jest.mock("@/components/homepage/CTASection", () => ({
  __esModule: true,
  default: () => <div data-testid="cta-section">CTA Section</div>,
}));

describe("HomePage", () => {
  it("should render all homepage sections", () => {
    render(<HomePage />);

    expect(screen.getByTestId("hero-section")).toBeInTheDocument();
    expect(screen.getByTestId("stats-section")).toBeInTheDocument();
    expect(screen.getByTestId("modes-section")).toBeInTheDocument();
    expect(screen.getByTestId("how-it-works-section")).toBeInTheDocument();
    expect(screen.getByTestId("domains-section")).toBeInTheDocument();
    expect(screen.getByTestId("cta-section")).toBeInTheDocument();
  });

  it("should have proper structure", () => {
    const { container } = render(<HomePage />);
    const mainElement = container.querySelector("main");
    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toHaveClass("min-h-screen");
  });

  it("should render sections in correct order", () => {
    const { container } = render(<HomePage />);
    const sections = container.querySelectorAll("[data-testid]");

    expect(sections[0]).toHaveAttribute("data-testid", "hero-section");
    expect(sections[1]).toHaveAttribute("data-testid", "stats-section");
    expect(sections[2]).toHaveAttribute("data-testid", "modes-section");
    expect(sections[3]).toHaveAttribute("data-testid", "how-it-works-section");
    expect(sections[4]).toHaveAttribute("data-testid", "domains-section");
    expect(sections[5]).toHaveAttribute("data-testid", "cta-section");
  });
});
