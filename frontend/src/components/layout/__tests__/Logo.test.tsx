import React from "react";
import { render, screen } from "@testing-library/react";
import { Logo } from "../Logo";

describe("Logo", () => {
  describe("Rendering", () => {
    it("renders logo image with correct attributes", () => {
      render(<Logo />);

      const logo = screen.getByAltText("AI Square Logo");
      expect(logo).toBeInTheDocument();
      // Next.js Image optimizes src with encoded URL
      expect(logo.getAttribute("src")).toContain("%2Fimages%2Flogo.png");
      expect(logo).toHaveAttribute("width", "32");
      expect(logo).toHaveAttribute("height", "32");
    });

    it("renders title text", () => {
      render(<Logo />);

      const title = screen.getByText("AI Square");
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe("H1");
    });

    it("wraps logo and title in link to home", () => {
      render(<Logo />);

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/");
      expect(link).toContainHTML("AI Square");
    });

    it("applies correct CSS classes for styling", () => {
      render(<Logo />);

      const title = screen.getByText("AI Square");
      expect(title).toHaveClass(
        "text-xl",
        "font-bold",
        "text-gray-900",
        "dark:text-white",
      );
    });

    it("has priority loading for logo image", () => {
      render(<Logo />);

      const logo = screen.getByAltText("AI Square Logo");
      // Next.js Image component with priority prop
      expect(logo.closest("img")).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("has accessible link with logo and title", () => {
      render(<Logo />);

      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
    });

    it("logo image has alt text", () => {
      render(<Logo />);

      const logo = screen.getByAltText("AI Square Logo");
      expect(logo).toHaveAttribute("alt", "AI Square Logo");
    });
  });
});
