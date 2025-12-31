import React from "react";
import { render, screen } from "@testing-library/react";
import PrivacyPolicyPage from "../page";

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: {
      changeLanguage: jest.fn(),
      language: "en",
    },
  }),
}));

describe("PrivacyPolicyPage", () => {
  it("should render without errors", () => {
    const { container } = render(<PrivacyPolicyPage />);
    expect(container).toBeTruthy();
  });

  it("should display the page title", () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
  });

  it("should show last updated date", () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
    expect(screen.getByText(/2025-06-30/)).toBeInTheDocument();
  });

  it("should display introduction text", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByText(/AI Square.*is committed to protecting your privacy/),
    ).toBeInTheDocument();
  });

  it("should display information collection section", () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByText("1. Information We Collect")).toBeInTheDocument();
    expect(screen.getByText("Personal Information")).toBeInTheDocument();
    expect(screen.getByText("Usage Data")).toBeInTheDocument();
  });

  it("should list personal information collected", () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByText("Email address")).toBeInTheDocument();
    expect(screen.getByText("Name (optional)")).toBeInTheDocument();
    expect(
      screen.getByText("User role (student, teacher, admin)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Language preference")).toBeInTheDocument();
  });

  it("should list usage data collected", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByText("Learning progress and assessment results"),
    ).toBeInTheDocument();
    expect(screen.getByText("Interactions with AI tutors")).toBeInTheDocument();
  });

  it("should have proper styling classes", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const mainDiv = container.firstElementChild;
    expect(mainDiv).toHaveClass("min-h-screen");
    expect(mainDiv).toHaveClass("bg-gradient-to-br");
  });

  it("should render content sections", () => {
    const { container } = render(<PrivacyPolicyPage />);
    const sections = container.querySelectorAll("section");
    expect(sections.length).toBeGreaterThan(0);
  });

  it("should use proper semantic HTML structure", () => {
    const { container } = render(<PrivacyPolicyPage />);
    expect(container.querySelector("h1")).toBeInTheDocument();
    expect(container.querySelectorAll("h2").length).toBeGreaterThan(0);
  });
});
