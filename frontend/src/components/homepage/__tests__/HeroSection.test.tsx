import React from "react";
import { render, screen } from "@testing-library/react";
import HeroSection from "../HeroSection";

// Mock next/link
jest.mock("next/link", () => {
  return ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  };
});

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: jest.fn(),
      language: "en",
    },
  }),
}));

describe("HeroSection", () => {
  it("should render hero section with title and subtitle", () => {
    render(<HeroSection />);

    expect(screen.getByText("hero.title")).toBeInTheDocument();
    expect(screen.getByText("hero.subtitle")).toBeInTheDocument();
  });

  it("should render journey link to PBL", () => {
    render(<HeroSection />);

    const journeyLink = screen.getByText("開始你的旅程").closest("a");
    expect(journeyLink).toHaveAttribute("href", "/pbl");
  });

  it("should render explore link to relations", () => {
    render(<HeroSection />);

    const exploreLink = screen.getByText("hero.cta.explore").closest("a");
    expect(exploreLink).toHaveAttribute("href", "/relations");
  });

  it("should render background decorations", () => {
    const { container } = render(<HeroSection />);

    // Check for background decoration elements
    const decorations = container.querySelectorAll(".absolute .rounded-full");
    expect(decorations.length).toBeGreaterThan(0);
  });

  it("should have proper gradient background", () => {
    render(<HeroSection />);

    const section = document.querySelector("section");
    expect(section?.className).toContain("bg-gradient-to-br");
    expect(section?.className).toContain("from-blue-50");
    expect(section?.className).toContain("via-indigo-50");
    expect(section?.className).toContain("to-purple-50");
  });

  it("should render visual representation icons", () => {
    const { container } = render(<HeroSection />);

    // Check for icon grid
    const iconGrid = container.querySelector(".grid-cols-2.md\\:grid-cols-4");
    expect(iconGrid).toBeInTheDocument();
  });

  it("should have responsive layout", () => {
    const { container } = render(<HeroSection />);

    // Check for responsive flex container
    const flexContainer = container.querySelector(".flex-col.sm\\:flex-row");
    expect(flexContainer).toBeInTheDocument();
  });

  it("should apply hover effects to links", () => {
    render(<HeroSection />);

    const journeyLink = screen.getByText("開始你的旅程").closest("a");
    expect(journeyLink).toHaveClass("hover:from-blue-700");
    expect(journeyLink).toHaveClass("transform");
    expect(journeyLink).toHaveClass("hover:scale-105");
  });
});
