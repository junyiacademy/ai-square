import React from "react";
import { render, screen } from "@testing-library/react";
import Home from "../page";

// Mock the landing page section components
jest.mock("@/components/landing/HeroSection", () => ({
  HeroSection: () => <section data-testid="hero-section">Hero Section</section>,
}));

jest.mock("@/components/landing/ValueProposition", () => ({
  ValueProposition: () => (
    <section data-testid="value-proposition">Value Proposition</section>
  ),
}));

jest.mock("@/components/landing/FeatureHighlights", () => ({
  FeatureHighlights: () => (
    <section data-testid="feature-highlights">Feature Highlights</section>
  ),
}));

jest.mock("@/components/landing/HowItWorks", () => ({
  HowItWorks: () => <section data-testid="how-it-works">How It Works</section>,
}));

jest.mock("@/components/landing/TargetAudience", () => ({
  TargetAudience: () => (
    <section data-testid="target-audience">Target Audience</section>
  ),
}));

describe("Home Page - Landing Page Redesign", () => {
  it("renders all landing page sections", () => {
    render(<Home />);

    expect(screen.getByTestId("hero-section")).toBeInTheDocument();
    expect(screen.getByTestId("value-proposition")).toBeInTheDocument();
    expect(screen.getByTestId("feature-highlights")).toBeInTheDocument();
    expect(screen.getByTestId("how-it-works")).toBeInTheDocument();
    expect(screen.getByTestId("target-audience")).toBeInTheDocument();
  });

  it("renders with correct layout structure", () => {
    const { container } = render(<Home />);

    // Check main element
    const main = container.querySelector("main");
    expect(main).toHaveClass("min-h-screen");
  });

  it("renders sections in the correct order", () => {
    const { container } = render(<Home />);

    const sections = container.querySelectorAll("[data-testid]");

    // Check order: HeroSection → ValueProposition → FeatureHighlights → HowItWorks → TargetAudience
    expect(sections[0]).toHaveAttribute("data-testid", "hero-section");
    expect(sections[1]).toHaveAttribute("data-testid", "value-proposition");
    expect(sections[2]).toHaveAttribute("data-testid", "feature-highlights");
    expect(sections[3]).toHaveAttribute("data-testid", "how-it-works");
    expect(sections[4]).toHaveAttribute("data-testid", "target-audience");
  });
});
