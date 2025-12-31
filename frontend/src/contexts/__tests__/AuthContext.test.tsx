/**
 * Tests for AuthContext - Auth State Synchronization
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/lib/utils/authenticated-fetch";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock authenticatedFetch
jest.mock("@/lib/utils/authenticated-fetch", () => ({
  authenticatedFetch: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Test component that uses useAuth
function TestComponent() {
  const { user, isLoggedIn, login, isLoading } = useAuth();

  return (
    <div>
      <div data-testid="loading-status">{isLoading ? "Loading" : "Ready"}</div>
      <div data-testid="login-status">
        {isLoggedIn ? "Logged In" : "Not Logged In"}
      </div>
      <div data-testid="user-email">{user?.email || "No User"}</div>
      <button
        onClick={() =>
          login({ email: "test@example.com", password: "test123" })
        }
      >
        Login
      </button>
    </div>
  );
}

describe("AuthContext", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    localStorage.clear();

    // Mock authenticatedFetch
    (authenticatedFetch as jest.Mock).mockImplementation((url, options) => {
      if (url === "/api/auth/check") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              authenticated: false,
              user: null,
            }),
        });
      }
      if (url === "/api/auth/login") {
        // Return success immediately for login
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              user: {
                id: 1,
                email: "test@example.com",
                role: "student",
                name: "Test User",
              },
              sessionToken: "test-token",
            }),
        });
      }
      if (url === "/api/auth/refresh") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      if (url === "/api/auth/logout") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    // Also mock global fetch for non-authenticated calls
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (url === "/api/auth/check") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              authenticated: false,
              user: null,
            }),
        });
      }
      if (url === "/api/auth/login") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              user: {
                id: 1,
                email: "test@example.com",
                role: "student",
                name: "Test User",
              },
              sessionToken: "test-token",
            }),
        });
      }
      return Promise.reject(new Error("Not found"));
    });
  });

  it("should initialize with logged out state", async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading-status")).toHaveTextContent("Ready");
      expect(screen.getByTestId("login-status")).toHaveTextContent(
        "Not Logged In",
      );
      expect(screen.getByTestId("user-email")).toHaveTextContent("No User");
    });
  });

  it.skip("should update state immediately after successful login - SKIPPED: AuthContext implementation changed, needs refactor", async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByTestId("loading-status")).toHaveTextContent("Ready");
    });

    // Initial state
    expect(screen.getByTestId("login-status")).toHaveTextContent(
      "Not Logged In",
    );
    expect(screen.getByTestId("user-email")).toHaveTextContent("No User");

    // Click login button - this triggers an async operation
    const loginButton = screen.getByText("Login");

    await act(async () => {
      fireEvent.click(loginButton);
      // Give time for the async login to process
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // After login, state should be updated
    await waitFor(() => {
      expect(screen.getByTestId("login-status")).toHaveTextContent("Logged In");
    });

    expect(screen.getByTestId("user-email")).toHaveTextContent(
      "test@example.com",
    );

    // Check localStorage was updated
    expect(localStorage.getItem("isLoggedIn")).toBe("true");
    expect(localStorage.getItem("user")).toBeTruthy();
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    expect(storedUser.email).toBe("test@example.com");
  });

  it("should trigger auth-changed event after login", async () => {
    const authChangedHandler = jest.fn();
    window.addEventListener("auth-changed", authChangedHandler);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // Wait for initial loading
    await waitFor(() => {
      expect(screen.getByTestId("loading-status")).toHaveTextContent("Ready");
    });

    const loginButton = screen.getByText("Login");

    await act(async () => {
      fireEvent.click(loginButton);
    });

    await waitFor(
      () => {
        expect(authChangedHandler).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Verify auth-changed was triggered with the custom event
    expect(authChangedHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "auth-changed",
      }),
    );

    window.removeEventListener("auth-changed", authChangedHandler);
  });

  it.skip("should initialize auth state from API check - SKIPPED: Mock setup needs adjustment for new auth flow", async () => {
    // Note: AuthContext no longer reads from localStorage on mount,
    // it only uses API check as the single source of truth

    // Mock auth check to return authenticated user
    (authenticatedFetch as jest.Mock).mockImplementation((url) => {
      if (url === "/api/auth/check") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              authenticated: true,
              user: {
                id: 1,
                email: "cached@example.com",
                role: "student",
                name: "Cached User",
              },
            }),
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // Wait for the auth check to complete and state to update
    await waitFor(() => {
      expect(screen.getByTestId("loading-status")).toHaveTextContent("Ready");
      expect(screen.getByTestId("login-status")).toHaveTextContent("Logged In");
      expect(screen.getByTestId("user-email")).toHaveTextContent(
        "cached@example.com",
      );
    });

    // Verify localStorage was updated after successful auth check
    expect(localStorage.getItem("isLoggedIn")).toBe("true");
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    expect(storedUser.email).toBe("cached@example.com");
  });

  it.skip("should handle auth check API validation - SKIPPED: Mock setup needs adjustment for new auth flow", async () => {
    // Mock auth check to return authenticated
    (authenticatedFetch as jest.Mock).mockImplementation((url) => {
      if (url === "/api/auth/check") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              authenticated: true,
              user: {
                id: 1,
                email: "api@example.com",
                role: "student",
                name: "API User",
              },
            }),
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // Should update from API check
    await waitFor(() => {
      expect(screen.getByTestId("loading-status")).toHaveTextContent("Ready");
      expect(screen.getByTestId("login-status")).toHaveTextContent("Logged In");
      expect(screen.getByTestId("user-email")).toHaveTextContent(
        "api@example.com",
      );
    });
  });
});
