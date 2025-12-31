/**
 * Tests for page
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Page from "../page";

// Mock i18n module - need to match what ForgotPasswordClient expects
jest.mock("@/i18n", () => ({
  __esModule: true,
  default: {
    hasResourceBundle: jest.fn(() => true),
    loadNamespaces: jest.fn(),
    language: "en",
  },
}));

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: "en",
      changeLanguage: jest.fn(),
    },
  }),
}));

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

describe("page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render without crashing", () => {
    const { container } = render(<Page />);
    expect(container).toBeInTheDocument();
  });

  it("should have proper structure", () => {
    render(<Page />);

    // Check for the title and form elements
    expect(screen.getByText("forgotPassword.title")).toBeInTheDocument();
    expect(screen.getByText("forgotPassword.subtitle")).toBeInTheDocument();

    // Check for email input
    const emailInput = screen.getByRole("textbox");
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("type", "email");

    // Check for submit button
    const submitButton = screen.getByRole("button");
    expect(submitButton).toBeInTheDocument();

    // Check for back to login link
    const backLink = screen.getByRole("link");
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/login");
  });

  it("should handle form submission", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true }),
      } as Response),
    );

    render(<Page />);

    const emailInput = screen.getByRole("textbox");
    const submitButton = screen.getByRole("button");

    // Enter email
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    expect(emailInput).toHaveValue("test@example.com");

    // Submit form
    fireEvent.click(submitButton);

    // Wait for success message
    await waitFor(() => {
      expect(
        screen.getByText("forgotPassword.successMessage"),
      ).toBeInTheDocument();
    });

    // Check that fetch was called
    expect(global.fetch).toHaveBeenCalledWith("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    });
  });

  it("should handle submission error", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({ success: false, error: "User not found" }),
      } as Response),
    );

    render(<Page />);

    const emailInput = screen.getByRole("textbox");
    const submitButton = screen.getByRole("button");

    // Enter email and submit
    fireEvent.change(emailInput, { target: { value: "notfound@example.com" } });
    fireEvent.click(submitButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText("User not found")).toBeInTheDocument();
    });
  });

  it("should match snapshot", () => {
    const { container } = render(<Page />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
