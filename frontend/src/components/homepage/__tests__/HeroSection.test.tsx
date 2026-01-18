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

    const journeyLink = screen.getByText("hero.cta.getStarted").closest("a");
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
    expect(section?.className).toContain("from-[#0363A7]/5");
    expect(section?.className).toContain("via-[#0363A7]/10");
    expect(section?.className).toContain("to-[#0363A7]/15");
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

    const journeyLink = screen.getByText("hero.cta.getStarted").closest("a");
    expect(journeyLink).toHaveClass("hover:bg-[#0363A7]/90");
    expect(journeyLink).toHaveClass("transform");
    expect(journeyLink).toHaveClass("hover:scale-105");
  });

  it("should render domain names with emojis", () => {
    render(<HeroSection />);

    // Verify all four domain names are displayed
    expect(screen.getByText("domains.items.engaging.name")).toBeInTheDocument();
    expect(screen.getByText("domains.items.creating.name")).toBeInTheDocument();
    expect(screen.getByText("domains.items.managing.name")).toBeInTheDocument();
    expect(screen.getByText("domains.items.designing.name")).toBeInTheDocument();
  });
});
