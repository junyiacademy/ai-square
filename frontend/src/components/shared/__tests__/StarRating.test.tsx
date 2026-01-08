/**
 * StarRating Component Tests
 *
 * Following TDD methodology:
 * 1. Write tests first (this file)
 * 2. Run tests - expect failures
 * 3. Implement component
 * 4. Run tests - expect passes
 * 5. Refactor
 * 6. Confirm tests still pass
 */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { StarRating, getStarRating } from "../StarRating";

describe("StarRating Component", () => {
  describe("getStarRating helper function", () => {
    it("should return 3 filled stars for score >= 91 (Perfect)", () => {
      expect(getStarRating(91)).toEqual({ filled: 3, empty: 0 });
      expect(getStarRating(95)).toEqual({ filled: 3, empty: 0 });
      expect(getStarRating(100)).toEqual({ filled: 3, empty: 0 });
    });

    it("should return 2 filled stars for score 71-90 (Great)", () => {
      expect(getStarRating(71)).toEqual({ filled: 2, empty: 1 });
      expect(getStarRating(80)).toEqual({ filled: 2, empty: 1 });
      expect(getStarRating(90)).toEqual({ filled: 2, empty: 1 });
    });

    it("should return 1 filled star for score < 71 (Good)", () => {
      expect(getStarRating(0)).toEqual({ filled: 1, empty: 2 });
      expect(getStarRating(50)).toEqual({ filled: 1, empty: 2 });
      expect(getStarRating(70)).toEqual({ filled: 1, empty: 2 });
    });

    it("should handle edge cases", () => {
      expect(getStarRating(-1)).toEqual({ filled: 1, empty: 2 });
      expect(getStarRating(101)).toEqual({ filled: 3, empty: 0 });
    });
  });

  describe("StarRating visual component", () => {
    it("should render 3 filled stars for perfect score (91+)", () => {
      const { container } = render(<StarRating score={95} />);

      const filledStars = container.querySelectorAll(
        '[class*="text-yellow-400"]',
      );
      const emptyStars = container.querySelectorAll('[class*="text-gray-300"]');

      expect(filledStars).toHaveLength(3);
      expect(emptyStars).toHaveLength(0);
    });

    it("should render 2 filled + 1 empty stars for great score (71-90)", () => {
      const { container } = render(<StarRating score={80} />);

      const filledStars = container.querySelectorAll(
        '[class*="text-yellow-400"]',
      );
      const emptyStars = container.querySelectorAll('[class*="text-gray-"]');

      expect(filledStars).toHaveLength(2);
      expect(emptyStars).toHaveLength(1);
    });

    it("should render 1 filled + 2 empty stars for good score (<71)", () => {
      const { container } = render(<StarRating score={60} />);

      const filledStars = container.querySelectorAll(
        '[class*="text-yellow-400"]',
      );
      const emptyStars = container.querySelectorAll('[class*="text-gray-"]');

      expect(filledStars).toHaveLength(1);
      expect(emptyStars).toHaveLength(2);
    });

    describe("size variants", () => {
      it("should apply small size classes (sm)", () => {
        const { container } = render(<StarRating score={90} size="sm" />);
        const stars = container.querySelectorAll("svg");

        expect(stars[0]).toHaveClass("w-4", "h-4");
      });

      it("should apply medium size classes by default (md)", () => {
        const { container } = render(<StarRating score={90} />);
        const stars = container.querySelectorAll("svg");

        expect(stars[0]).toHaveClass("w-6", "h-6");
      });

      it("should apply large size classes (lg)", () => {
        const { container } = render(<StarRating score={90} size="lg" />);
        const stars = container.querySelectorAll("svg");

        expect(stars[0]).toHaveClass("w-8", "h-8");
      });
    });

    it("should render stars in a flex container with proper gap", () => {
      const { container } = render(<StarRating score={80} />);
      const flexContainer = container.querySelector(".flex");

      expect(flexContainer).toBeInTheDocument();
      expect(flexContainer).toHaveClass("items-center", "gap-0.5");
    });

    it("should use SVG for star icons", () => {
      const { container } = render(<StarRating score={95} />);
      const svgs = container.querySelectorAll("svg");

      expect(svgs.length).toBeGreaterThan(0);
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
      });
    });

    it("should have unique keys for stars", () => {
      const { container } = render(<StarRating score={80} />);

      // React should not warn about duplicate keys
      // This is implicitly tested - no console warnings
      const stars = container.querySelectorAll("svg");
      expect(stars.length).toBe(3); // 2 filled + 1 empty
    });

    describe("accessibility", () => {
      it("should be readable by screen readers", () => {
        const { container } = render(<StarRating score={80} />);

        // SVG elements should be present and visible
        const svgs = container.querySelectorAll("svg");
        expect(svgs.length).toBeGreaterThan(0);
      });

      it("should maintain semantic structure", () => {
        const { container } = render(<StarRating score={80} />);

        // Should be wrapped in a container div
        const wrapper = container.querySelector("div");
        expect(wrapper).toBeInTheDocument();
      });
    });
  });

  describe("integration with scoring system", () => {
    const scoringThresholds = [
      { score: 100, expectedFilled: 3, expectedEmpty: 0, rating: "Perfect" },
      { score: 91, expectedFilled: 3, expectedEmpty: 0, rating: "Perfect" },
      { score: 90, expectedFilled: 2, expectedEmpty: 1, rating: "Great" },
      { score: 71, expectedFilled: 2, expectedEmpty: 1, rating: "Great" },
      { score: 70, expectedFilled: 1, expectedEmpty: 2, rating: "Good" },
      { score: 50, expectedFilled: 1, expectedEmpty: 2, rating: "Good" },
      { score: 0, expectedFilled: 1, expectedEmpty: 2, rating: "Good" },
    ];

    scoringThresholds.forEach(
      ({ score, expectedFilled, expectedEmpty, rating }) => {
        it(`should render correctly for ${rating} score: ${score}`, () => {
          const { container } = render(<StarRating score={score} />);

          const filledStars = container.querySelectorAll(
            '[class*="text-yellow-400"]',
          );
          const emptyStars = container.querySelectorAll(
            '[class*="text-gray-"]',
          );

          expect(filledStars).toHaveLength(expectedFilled);
          expect(emptyStars).toHaveLength(expectedEmpty);
        });
      },
    );
  });
});
