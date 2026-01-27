import React from "react";
import { render, screen } from "@testing-library/react";
import { DesktopNavigation } from "../DesktopNavigation";
import type { NavLink } from "../types";

// Mock usePathname
const mockPathname = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

// Mock useTranslation
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("DesktopNavigation", () => {
  const primaryNavLinks: NavLink[] = [
    { href: "/relations", label: "relations" },
    { href: "/ksa", label: "ksa" },
    { href: "/pbl/scenarios", label: "pbl" },
  ];

  const secondaryNavLinks: NavLink[] = [
    {
      href: "/assessment/scenarios",
      label: "assessment",
      disabled: true,
      tooltip: "comingSoon",
    },
    {
      href: "/dashboard",
      label: "dashboard",
      disabled: true,
      tooltip: "comingSoon",
    },
    {
      href: "/history",
      label: "history",
      disabled: true,
      tooltip: "comingSoon",
    },
    {
      href: "/discovery/overview",
      label: "discovery",
      disabled: true,
      tooltip: "comingSoon",
    },
  ];

  beforeEach(() => {
    mockPathname.mockReturnValue("/");
  });

  describe("Rendering", () => {
    it("renders navigation element with correct aria-label", () => {
      render(
        <DesktopNavigation
          primaryNavLinks={primaryNavLinks}
          secondaryNavLinks={secondaryNavLinks}
        />,
      );

      const nav = screen.getByRole("navigation", { name: "Main navigation" });
      expect(nav).toBeInTheDocument();
    });

    it("renders all primary navigation links", () => {
      render(
        <DesktopNavigation
          primaryNavLinks={primaryNavLinks}
          secondaryNavLinks={secondaryNavLinks}
        />,
      );

      expect(screen.getByText("relations")).toBeInTheDocument();
      expect(screen.getByText("ksa")).toBeInTheDocument();
      expect(screen.getByText("pbl")).toBeInTheDocument();
    });

    it("renders More dropdown button", () => {
      render(
        <DesktopNavigation
          primaryNavLinks={primaryNavLinks}
          secondaryNavLinks={secondaryNavLinks}
        />,
      );

      expect(screen.getByText("more")).toBeInTheDocument();
    });

    it("renders secondary navigation links in dropdown", () => {
      render(
        <DesktopNavigation
          primaryNavLinks={primaryNavLinks}
          secondaryNavLinks={secondaryNavLinks}
        />,
      );

      expect(screen.getByText("assessment")).toBeInTheDocument();
      expect(screen.getByText("dashboard")).toBeInTheDocument();
      expect(screen.getByText("history")).toBeInTheDocument();
      expect(screen.getByText("discovery")).toBeInTheDocument();
    });
  });

  describe("Active Link Highlighting", () => {
    it("highlights active navigation link", () => {
      mockPathname.mockReturnValue("/pbl/scenarios");

      render(
        <DesktopNavigation
          primaryNavLinks={primaryNavLinks}
          secondaryNavLinks={secondaryNavLinks}
        />,
      );

      const pblLink = screen.getByRole("link", { name: "pbl" });
      expect(pblLink).toHaveClass("text-gray-900");
      expect(pblLink).toHaveClass("border-b-2");
      expect(pblLink).toHaveClass("border-[#0363A7]");
    });

    it("applies hover styles to inactive links", () => {
      mockPathname.mockReturnValue("/");

      render(
        <DesktopNavigation
          primaryNavLinks={primaryNavLinks}
          secondaryNavLinks={secondaryNavLinks}
        />,
      );

      const relationsLink = screen.getByRole("link", { name: "relations" });
      expect(relationsLink).toHaveClass("text-gray-500");
      expect(relationsLink).toHaveClass("hover:text-gray-900");
    });
  });

  describe("Disabled Links", () => {
    it("shows disabled links with proper styling", () => {
      render(
        <DesktopNavigation
          primaryNavLinks={primaryNavLinks}
          secondaryNavLinks={secondaryNavLinks}
        />,
      );

      const assessmentLink = screen.getByText("assessment");
      expect(assessmentLink).toHaveClass("text-gray-400");
      expect(assessmentLink).toHaveClass("cursor-not-allowed");
    });

    it("displays tooltip for disabled links", () => {
      render(
        <DesktopNavigation
          primaryNavLinks={primaryNavLinks}
          secondaryNavLinks={secondaryNavLinks}
        />,
      );

      const assessmentText = screen.getByText("assessment");
      // The tooltip is in a span next to the text (multiple disabled links have this tooltip)
      const tooltips = screen.getAllByText("(comingSoon)");
      expect(tooltips.length).toBeGreaterThan(0);
    });
  });

  describe("Responsive Behavior", () => {
    it("is hidden on mobile devices (lg:flex class)", () => {
      render(
        <DesktopNavigation
          primaryNavLinks={primaryNavLinks}
          secondaryNavLinks={secondaryNavLinks}
        />,
      );

      const nav = screen.getByRole("navigation", { name: "Main navigation" });
      expect(nav).toHaveClass("hidden");
      expect(nav).toHaveClass("lg:flex");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty primary links array", () => {
      render(
        <DesktopNavigation
          primaryNavLinks={[]}
          secondaryNavLinks={secondaryNavLinks}
        />,
      );

      const nav = screen.getByRole("navigation", { name: "Main navigation" });
      expect(nav).toBeInTheDocument();
    });

    it("handles empty secondary links array", () => {
      render(
        <DesktopNavigation
          primaryNavLinks={primaryNavLinks}
          secondaryNavLinks={[]}
        />,
      );

      expect(screen.getByText("more")).toBeInTheDocument();
    });

    it("handles links without href", () => {
      const linksWithoutHref: NavLink[] = [{ label: "no-href-link" }];

      render(
        <DesktopNavigation
          primaryNavLinks={linksWithoutHref}
          secondaryNavLinks={[]}
        />,
      );

      const nav = screen.getByRole("navigation", { name: "Main navigation" });
      expect(nav).toBeInTheDocument();
    });
  });
});
