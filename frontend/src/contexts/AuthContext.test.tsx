import React from "react";
import { render, screen } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

describe("AuthContext", () => {
  it("should provide default auth values", () => {
    const TestComponent = () => {
      const auth = useAuth();
      return (
        <div>
          <div data-testid="user">{auth.user ? "Has user" : "No user"}</div>
          <div data-testid="logged-in">{auth.isLoggedIn ? "Yes" : "No"}</div>
          <div data-testid="loading">{auth.isLoading ? "Yes" : "No"}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    expect(screen.getByTestId("user")).toHaveTextContent("No user");
    expect(screen.getByTestId("logged-in")).toHaveTextContent("No");
    expect(screen.getByTestId("loading")).toHaveTextContent("No");
  });

  it("should provide auth functions", () => {
    const TestComponent = () => {
      const auth = useAuth();
      return (
        <div>
          <div data-testid="has-login">
            {typeof auth.login === "function" ? "Yes" : "No"}
          </div>
          <div data-testid="has-logout">
            {typeof auth.logout === "function" ? "Yes" : "No"}
          </div>
          <div data-testid="has-check">
            {typeof auth.checkAuth === "function" ? "Yes" : "No"}
          </div>
          <div data-testid="has-refresh">
            {typeof auth.refreshToken === "function" ? "Yes" : "No"}
          </div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    expect(screen.getByTestId("has-login")).toHaveTextContent("Yes");
    expect(screen.getByTestId("has-logout")).toHaveTextContent("Yes");
    expect(screen.getByTestId("has-check")).toHaveTextContent("Yes");
    expect(screen.getByTestId("has-refresh")).toHaveTextContent("Yes");
  });

  it("should handle useAuth being called with mock", () => {
    const auth = useAuth();
    expect(auth).toBeDefined();
    expect(auth.user).toBe(null);
    expect(auth.isLoading).toBe(false);
    expect(auth.isLoggedIn).toBe(false);
  });
});
