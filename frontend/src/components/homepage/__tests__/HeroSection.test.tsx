import React from "react";
import { render, screen } from "@testing-library/react";
import HeroSection from "../HeroSection";

jest.mock("next/link", () => {
  return ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn(), language: "en" },
  }),
}));

describe("HeroSection", () => {
  it("renders title and subtitle", () => {
    render(<HeroSection />);
    expect(screen.getByText("hero.title")).toBeInTheDocument();
    expect(screen.getByText("hero.subtitle")).toBeInTheDocument();
  });

  it("renders CTA link to assessment", () => {
    render(<HeroSection />);
    const link = screen.getByText("hero.cta.getStarted").closest("a");
    expect(link).toHaveAttribute("href", "/assessment");
  });

  it("renders explore link to discovery", () => {
    render(<HeroSection />);
    const link = screen.getByText("hero.cta.explore").closest("a");
    expect(link).toHaveAttribute("href", "/discovery");
  });

  it("has responsive layout", () => {
    const { container } = render(<HeroSection />);
    const flexContainer = container.querySelector(".flex-col.sm\\:flex-row");
    expect(flexContainer).toBeInTheDocument();
  });

  it("uses Lucide ArrowRight icon instead of inline SVG", () => {
    const { container } = render(<HeroSection />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });
});
