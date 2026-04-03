import React from "react";
import { render, screen } from "@testing-library/react";
import ModesSection from "../ModesSection";

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

describe("ModesSection", () => {
  it("renders section title", () => {
    render(<ModesSection />);
    expect(screen.getByText("modes.title")).toBeInTheDocument();
    expect(screen.getByText("modes.subtitle")).toBeInTheDocument();
  });

  it("renders three mode cards", () => {
    render(<ModesSection />);
    expect(screen.getByText("modes.assessment.title")).toBeInTheDocument();
    expect(screen.getByText("modes.pbl.title")).toBeInTheDocument();
    expect(screen.getByText("modes.discovery.title")).toBeInTheDocument();
  });

  it("renders mode descriptions", () => {
    render(<ModesSection />);
    expect(screen.getByText("modes.assessment.description")).toBeInTheDocument();
    expect(screen.getByText("modes.pbl.description")).toBeInTheDocument();
    expect(screen.getByText("modes.discovery.description")).toBeInTheDocument();
  });

  it("links to correct routes", () => {
    render(<ModesSection />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/assessment");
    expect(hrefs).toContain("/pbl");
    expect(hrefs).toContain("/discovery");
  });

  it("renders CTA text for each mode", () => {
    render(<ModesSection />);
    expect(screen.getByText("modes.assessment.cta")).toBeInTheDocument();
    expect(screen.getByText("modes.pbl.cta")).toBeInTheDocument();
    expect(screen.getByText("modes.discovery.cta")).toBeInTheDocument();
  });
});
