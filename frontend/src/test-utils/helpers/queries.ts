/**
 * Custom Query Helpers
 * Helper functions for better test assertions and queries
 */

import { screen, within, waitFor } from "@testing-library/react";

/**
 * Find text within a specific parent container
 * Useful when multiple elements have the same text
 */
export const getByTextInContainer = (
  containerSelector: string,
  text: string | RegExp,
) => {
  const container =
    screen.getByTestId(containerSelector) ||
    document.querySelector(containerSelector);
  if (!container) {
    throw new Error(`Container with selector "${containerSelector}" not found`);
  }
  return within(container as HTMLElement).getByText(text);
};

/**
 * Find text by its container role or data-testid
 */
export const getByTextInRole = (
  role: string,
  text: string | RegExp,
  options?: { name?: string },
) => {
  const container = screen.getByRole(role, options);
  return within(container).getByText(text);
};

/**
 * Get statistics card value by its label
 * Useful for components that display multiple statistics
 */
export const getStatisticByLabel = (label: string): HTMLElement => {
  // Find the label element
  const labelElement = screen.getByText(label);

  // Find the parent container (usually a div with specific class)
  let parent = labelElement.parentElement;
  while (parent && !parent.classList.contains("text-center")) {
    parent = parent.parentElement;
  }

  if (!parent) {
    throw new Error(`Could not find parent container for label: ${label}`);
  }

  // Look for the value element (usually the first child with large font)
  const valueElement = parent.querySelector(".text-2xl, .text-3xl, .font-bold");
  if (!valueElement) {
    throw new Error(`Could not find value element for label: ${label}`);
  }

  return valueElement as HTMLElement;
};

/**
 * Get badge by its category (earned/available)
 */
export const getBadgeByCategory = (
  badgeName: string,
  category: "earned" | "available",
) => {
  const badgeElements = screen.getAllByText(badgeName);

  for (const badge of badgeElements) {
    const container = badge.closest(".bg-white, .bg-gradient-to-br");
    if (!container) continue;

    const statusText = within(container as HTMLElement).queryByText(
      category === "earned" ? "已獲得" : "待獲得",
    );

    if (statusText) {
      return badge;
    }
  }

  throw new Error(`Could not find ${category} badge: ${badgeName}`);
};

/**
 * Wait for element to appear with custom timeout
 */
export const waitForElementWithTimeout = async (
  getElement: () => HTMLElement | null,
  timeout = 5000,
) => {
  return waitFor(
    () => {
      const element = getElement();
      if (!element) {
        throw new Error("Element not found");
      }
      return element;
    },
    { timeout },
  );
};

/**
 * Check if element exists without throwing
 */
export const elementExists = (text: string | RegExp): boolean => {
  try {
    screen.getByText(text);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get all elements by text and filter by container
 */
export const getAllByTextInContainer = (
  containerSelector: string,
  text: string | RegExp,
) => {
  const container =
    screen.getByTestId(containerSelector) ||
    document.querySelector(containerSelector);
  if (!container) {
    throw new Error(`Container with selector "${containerSelector}" not found`);
  }
  return within(container as HTMLElement).getAllByText(text);
};

/**
 * Assert element count within container
 */
export const expectElementCountInContainer = (
  containerSelector: string,
  text: string | RegExp,
  expectedCount: number,
) => {
  const elements = getAllByTextInContainer(containerSelector, text);
  expect(elements).toHaveLength(expectedCount);
  return elements;
};

/**
 * Get unique element by combining text and nearby text
 * Useful when multiple elements have same text but different context
 */
export const getByTextWithContext = (
  text: string | RegExp,
  contextText: string | RegExp,
) => {
  const elements = screen.getAllByText(text);

  for (const element of elements) {
    const container = element.closest("div, section, article");
    if (
      container &&
      within(container as HTMLElement).queryByText(contextText)
    ) {
      return element;
    }
  }

  throw new Error(
    `Could not find element with text "${text}" and context "${contextText}"`,
  );
};

/**
 * Check if element has specific CSS class
 */
export const hasClass = (element: HTMLElement, className: string): boolean => {
  return element.classList.contains(className);
};

/**
 * Get computed style property
 */
export const getComputedStyleProperty = (
  element: HTMLElement,
  property: string,
): string => {
  return window.getComputedStyle(element).getPropertyValue(property);
};
