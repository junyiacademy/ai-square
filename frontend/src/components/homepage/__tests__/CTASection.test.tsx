import React from "react";
import { render, screen } from "@testing-library/react";
import CTASection from "../CTASection";

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
    t: (key: string) => {
      const translations: Record<string, string> = {
        "cta.title": "Ready to Start Your AI Learning Journey?",
        "cta.subtitle": "Join learners from around the world",
        "cta.button": "Get Started Free",
        "cta.login": "Already have an account? Sign in",
      };
      return translations[key] || key;
    },
  }),
}));

describe("CTASection", () => {
  it("renders title and subtitle", () => {
    render(<CTASection />);
    expect(screen.getByText("Ready to Start Your AI Learning Journey?")).toBeInTheDocument();
    expect(screen.getByText("Join learners from around the world")).toBeInTheDocument();
  });

  it("renders register link", () => {
    render(<CTASection />);
    const link = screen.getByText("Get Started Free").closest("a");
    expect(link).toHaveAttribute("href", "/register");
  });

  it("renders login link", () => {
    render(<CTASection />);
    const link = screen.getByText("Already have an account? Sign in").closest("a");
    expect(link).toHaveAttribute("href", "/login");
  });

  it("has blue background", () => {
    const { container } = render(<CTASection />);
    const section = container.querySelector("section");
    expect(section).toHaveClass("bg-[#0363A7]");
  });

  it("renders Lucide ArrowRight icon", () => {
    const { container } = render(<CTASection />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });
});
