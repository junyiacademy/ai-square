import React from "react";
import { render, screen } from "@testing-library/react";
import DomainsSection from "../DomainsSection";

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

describe("DomainsSection", () => {
  it("renders section title", () => {
    render(<DomainsSection />);
    expect(screen.getByText("domains.title")).toBeInTheDocument();
    expect(screen.getByText("domains.subtitle")).toBeInTheDocument();
  });

  it("renders all four domains", () => {
    render(<DomainsSection />);
    expect(screen.getByText("domains.items.engaging.name")).toBeInTheDocument();
    expect(screen.getByText("domains.items.creating.name")).toBeInTheDocument();
    expect(screen.getByText("domains.items.managing.name")).toBeInTheDocument();
    expect(screen.getByText("domains.items.designing.name")).toBeInTheDocument();
  });

  it("renders domain descriptions", () => {
    render(<DomainsSection />);
    expect(screen.getByText("domains.items.engaging.description")).toBeInTheDocument();
    expect(screen.getByText("domains.items.creating.description")).toBeInTheDocument();
    expect(screen.getByText("domains.items.managing.description")).toBeInTheDocument();
    expect(screen.getByText("domains.items.designing.description")).toBeInTheDocument();
  });

  it("links all domains to relations page", () => {
    render(<DomainsSection />);
    const links = screen.getAllByRole("link");
    links.forEach((link) => {
      expect(link).toHaveAttribute("href", "/relations");
    });
  });

  it("renders Lucide icons", () => {
    const { container } = render(<DomainsSection />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(4);
  });

  it("uses 2-column grid", () => {
    const { container } = render(<DomainsSection />);
    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("sm:grid-cols-2");
  });
});
