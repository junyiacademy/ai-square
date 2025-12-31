import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  HistoryListSkeleton,
  HistoryHeaderSkeleton,
  HistoryFiltersSkeleton,
  HistoryPageSkeleton,
} from "../history-skeletons";

describe("History Skeletons", () => {
  describe("HistoryListSkeleton", () => {
    it("renders 5 history item skeletons", () => {
      render(<HistoryListSkeleton />);

      // Should have 5 cards
      const cards = screen
        .getAllByRole("generic")
        .filter(
          (el) =>
            el.classList.contains("bg-white") &&
            el.classList.contains("rounded-lg"),
        );
      expect(cards).toHaveLength(5);
    });

    it("renders skeleton items with animate-pulse effect", () => {
      const { container } = render(<HistoryListSkeleton />);

      const animatedElements = container.querySelectorAll(".animate-pulse");
      expect(animatedElements).toHaveLength(5);
    });

    it("renders complete structure for each history item", () => {
      const { container } = render(<HistoryListSkeleton />);

      const firstCard = container.querySelector(".bg-white");
      expect(firstCard).toBeInTheDocument();

      // Check for header section with type and title
      const headerSkeletons = firstCard?.querySelectorAll(".h-5, .h-6");
      expect(headerSkeletons?.length).toBeGreaterThan(0);

      // Check for stats section
      const statsSection = firstCard?.querySelector(".bg-gray-50");
      expect(statsSection).toBeInTheDocument();

      // Check for footer with divider
      const footer = firstCard?.querySelector(".border-t");
      expect(footer).toBeInTheDocument();
    });

    it("renders grid layout for stats in each item", () => {
      const { container } = render(<HistoryListSkeleton />);

      const grids = container.querySelectorAll(
        ".grid.grid-cols-1.md\\:grid-cols-2",
      );
      expect(grids).toHaveLength(5); // One for each history item
    });

    it("renders progress bars in stats section", () => {
      const { container } = render(<HistoryListSkeleton />);

      // Each item has 4 progress bars
      const progressBars = container.querySelectorAll(".rounded-full.h-2");
      expect(progressBars).toHaveLength(20); // 5 items * 4 progress bars
    });
  });

  describe("HistoryHeaderSkeleton", () => {
    it("renders header skeleton with title and description", () => {
      const { container } = render(<HistoryHeaderSkeleton />);

      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass("mb-8", "animate-pulse");

      // Check for title skeleton
      const title = container.querySelector(".h-8.w-48");
      expect(title).toBeInTheDocument();

      // Check for description skeleton
      const description = container.querySelector(".h-5.w-96");
      expect(description).toBeInTheDocument();
    });
  });

  describe("HistoryFiltersSkeleton", () => {
    it("renders 3 filter button skeletons", () => {
      const { container } = render(<HistoryFiltersSkeleton />);

      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass("mb-6", "animate-pulse");

      // Check for filter buttons
      const filterButtons = container.querySelectorAll(".h-10.w-32");
      expect(filterButtons).toHaveLength(3);
    });

    it("renders filters in a flex layout with spacing", () => {
      const { container } = render(<HistoryFiltersSkeleton />);

      const flexContainer = container.querySelector(".flex.space-x-2");
      expect(flexContainer).toBeInTheDocument();
    });
  });

  describe("HistoryPageSkeleton", () => {
    it("renders complete page skeleton with all components", () => {
      render(<HistoryPageSkeleton />);

      // Check for main element
      const main = screen.getByRole("main");
      expect(main).toHaveClass("min-h-screen", "bg-gray-50");

      // Check for container
      const container = main.querySelector(".max-w-7xl.mx-auto");
      expect(container).toBeInTheDocument();
    });

    it("includes header, filters, and list skeletons", () => {
      const { container } = render(<HistoryPageSkeleton />);

      // Check for header
      const header = container.querySelector(".h-8.w-48");
      expect(header).toBeInTheDocument();

      // Check for filters
      const filters = container.querySelectorAll(".h-10.w-32");
      expect(filters).toHaveLength(3);

      // Check for list items
      const listItems = container.querySelectorAll(
        ".bg-white.dark\\:bg-gray-800.rounded-lg.shadow-md.p-6",
      );
      expect(listItems).toHaveLength(5);
    });

    it("applies dark mode classes correctly", () => {
      const { container } = render(<HistoryPageSkeleton />);

      // Check for dark mode classes
      const darkElements = container.querySelectorAll('[class*="dark:"]');
      expect(darkElements.length).toBeGreaterThan(0);
    });
  });
});
