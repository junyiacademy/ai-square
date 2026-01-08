import React from "react";
import { render, screen } from "@testing-library/react";
import {
  LoadingSkeleton,
  LoadingCard,
  LoadingAccordion,
} from "../loading-skeleton";

describe("LoadingSkeleton Components", () => {
  describe("LoadingSkeleton base component", () => {
    it("renders with default props", () => {
      const { container } = render(<LoadingSkeleton />);

      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass("animate-pulse", "bg-gray-200", "rounded");
    });

    it("renders with custom className", () => {
      const { container } = render(
        <LoadingSkeleton className="custom-class h-10" />,
      );

      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass("custom-class", "h-10", "animate-pulse");
    });

    it("renders with custom className for width and height", () => {
      const { container } = render(
        <LoadingSkeleton className="w-[200px] h-[50px]" />,
      );

      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass("w-[200px]", "h-[50px]");
    });

    it("renders circular variant with className", () => {
      const { container } = render(
        <LoadingSkeleton className="rounded-full" />,
      );

      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass("rounded-full");
    });

    it("renders without rounded corners using className", () => {
      const { container } = render(
        <LoadingSkeleton className="rounded-none" />,
      );

      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass("rounded-none");
    });

    it("renders with dark background using className", () => {
      const { container } = render(<LoadingSkeleton className="bg-gray-800" />);

      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass("bg-gray-800");
    });

    it("renders without animation when animate is false", () => {
      const { container } = render(<LoadingSkeleton animate={false} />);

      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).not.toHaveClass("animate-pulse");
      expect(skeleton).toHaveClass("bg-gray-200", "rounded");
    });
  });

  describe("LoadingCard", () => {
    it("renders card with default props", () => {
      const { container } = render(<LoadingCard />);

      const card = container.firstChild as HTMLElement;
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("bg-white", "rounded-lg", "shadow-md", "p-6");

      // Check for image skeleton and content skeletons
      const skeletons = container.querySelectorAll(".bg-gray-200");
      expect(skeletons.length).toBe(5); // 1 image + 1 title + 3 content lines
    });

    it("renders without image when showImage is false", () => {
      const { container } = render(<LoadingCard showImage={false} />);

      const skeletons = container.querySelectorAll(".bg-gray-200");
      expect(skeletons.length).toBe(4); // 1 title + 3 content lines

      // Check that there's no image skeleton (h-48)
      const imageSkeletons = Array.from(skeletons).filter((el) =>
        el.classList.contains("h-48"),
      );
      expect(imageSkeletons.length).toBe(0);
    });

    it("renders correct number of content lines", () => {
      const { container } = render(<LoadingCard lines={5} />);

      const skeletons = container.querySelectorAll(".bg-gray-200");
      expect(skeletons.length).toBe(7); // 1 image + 1 title + 5 content lines
    });

    it("renders last line with half width", () => {
      const { container } = render(<LoadingCard lines={3} />);

      const skeletons = container.querySelectorAll(".bg-gray-200");
      const lastContentSkeleton = skeletons[skeletons.length - 1];
      expect(lastContentSkeleton).toHaveClass("w-1/2");
    });

    it("renders other lines with full width", () => {
      const { container } = render(<LoadingCard lines={3} />);

      const skeletons = container.querySelectorAll(".bg-gray-200");
      // Check middle content lines (not first title, not last line)
      const middleContentSkeleton = skeletons[3]; // Second content line
      expect(middleContentSkeleton).toHaveClass("w-full");
    });
  });

  describe("LoadingAccordion", () => {
    it("renders accordion skeleton with correct structure", () => {
      const { container } = render(<LoadingAccordion />);

      const accordion = container.firstChild as HTMLElement;
      expect(accordion).toBeInTheDocument();
      expect(accordion).toHaveClass("space-y-4");

      // Check for 4 accordion items
      const accordionItems = container.querySelectorAll(".bg-gradient-to-r");
      expect(accordionItems.length).toBe(4);
    });

    it("renders each accordion item with correct structure", () => {
      const { container } = render(<LoadingAccordion />);

      const firstItem = container.querySelector(
        ".bg-gradient-to-r",
      ) as HTMLElement;
      expect(firstItem).toHaveClass(
        "from-blue-100",
        "to-purple-100",
        "px-6",
        "py-4",
        "rounded-lg",
        "shadow",
      );

      // Check for icon, title, and chevron skeletons in each item
      const skeletons = firstItem.querySelectorAll(".bg-gray-200");
      expect(skeletons.length).toBe(3); // icon + title + chevron
    });

    it("renders icon skeleton with correct classes", () => {
      const { container } = render(<LoadingAccordion />);

      const firstItem = container.querySelector(
        ".bg-gradient-to-r",
      ) as HTMLElement;
      const iconSkeleton = firstItem.querySelector(".h-8.w-8") as HTMLElement;
      expect(iconSkeleton).toHaveClass("h-8", "w-8", "rounded", "mr-3");
    });

    it("renders title skeleton with correct classes", () => {
      const { container } = render(<LoadingAccordion />);

      const firstItem = container.querySelector(
        ".bg-gradient-to-r",
      ) as HTMLElement;
      const titleSkeleton = firstItem.querySelector(".h-6.w-48") as HTMLElement;
      expect(titleSkeleton).toHaveClass("h-6", "w-48");
    });

    it("renders chevron skeleton with correct classes", () => {
      const { container } = render(<LoadingAccordion />);

      const firstItem = container.querySelector(
        ".bg-gradient-to-r",
      ) as HTMLElement;
      const chevronSkeleton = firstItem.querySelector(
        ".h-6.w-6",
      ) as HTMLElement;
      expect(chevronSkeleton).toHaveClass("h-6", "w-6");
    });
  });
});
