import React from "react";
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

// Mock the new landing page components
jest.mock("@/components/navigation/Navbar", () => ({
  Navbar: () => <nav data-testid="navbar">Navbar</nav>,
}));

jest.mock("@/components/navigation/Footer", () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>,
}));

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

describe("HomePage - Landing Page Redesign", () => {
  it("should render navigation components", () => {
    render(<HomePage />);

    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("should render all landing page sections", () => {
    render(<HomePage />);

    expect(screen.getByTestId("hero-section")).toBeInTheDocument();
    expect(screen.getByTestId("value-proposition")).toBeInTheDocument();
    expect(screen.getByTestId("feature-highlights")).toBeInTheDocument();
    expect(screen.getByTestId("how-it-works")).toBeInTheDocument();
    expect(screen.getByTestId("target-audience")).toBeInTheDocument();
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

    // Check order: Navbar → HeroSection → ValueProposition → FeatureHighlights → HowItWorks → TargetAudience → Footer
    expect(sections[0]).toHaveAttribute("data-testid", "navbar");
    expect(sections[1]).toHaveAttribute("data-testid", "hero-section");
    expect(sections[2]).toHaveAttribute("data-testid", "value-proposition");
    expect(sections[3]).toHaveAttribute("data-testid", "feature-highlights");
    expect(sections[4]).toHaveAttribute("data-testid", "how-it-works");
    expect(sections[5]).toHaveAttribute("data-testid", "target-audience");
    expect(sections[6]).toHaveAttribute("data-testid", "footer");
  });
});
