/**
 * Test Helpers Usage Examples
 * 展示如何使用集中的測試工具
 */

import React from "react";
import {
  renderWithProviders,
  screen,
  waitFor,
  resetAllMocks,
  setupAuthenticatedUser,
  setupUnauthenticatedUser,
  testUsers,
  mockApiSuccess,
  mockApiError,
  navigationMocks,
  themeMocks,
  mockFetch,
  mockLocalStorage,
  createMockScenario,
  createMockProgram,
  createMockTask,
} from "@/test/utils/test-helpers";

// Example Component for testing
function ExampleComponent() {
  const { user, isLoggedIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  return (
    <div>
      <h1>Example Component</h1>
      {isLoggedIn ? (
        <div>
          <p>Welcome, {user?.name}!</p>
          <button onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </button>
        </div>
      ) : (
        <button onClick={() => router.push("/login")}>Login</button>
      )}
      <button onClick={toggleTheme}>Toggle Theme ({theme})</button>
    </div>
  );
}

// Mocks needed for the component
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";

describe("Test Helpers Usage Examples", () => {
  // Always reset mocks before each test
  beforeEach(() => {
    resetAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders component with default unauthenticated state", () => {
      // Default state is already unauthenticated
      renderWithProviders(<ExampleComponent />);

      expect(screen.getByText("Example Component")).toBeInTheDocument();
      expect(screen.getByText("Login")).toBeInTheDocument();
      expect(screen.queryByText(/Welcome/)).not.toBeInTheDocument();
    });

    it("renders with authenticated user", () => {
      // Setup authenticated state before rendering
      setupAuthenticatedUser(testUsers.student);

      renderWithProviders(<ExampleComponent />);

      expect(screen.getByText("Welcome, Test Student!")).toBeInTheDocument();
      expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
    });

    it("renders with custom theme", () => {
      renderWithProviders(<ExampleComponent />, { theme: "dark" });

      expect(screen.getByText("Toggle Theme (dark)")).toBeInTheDocument();
    });

    it("renders with custom route", () => {
      renderWithProviders(<ExampleComponent />, { route: "/dashboard" });

      // Component can access the current route via usePathname
    });
  });

  describe("User Interactions", () => {
    it("handles navigation on button click", async () => {
      const { user } = renderWithProviders(<ExampleComponent />);

      // Using userEvent from the render result
      await user.click(screen.getByText("Login"));

      expect(navigationMocks.mockPush).toHaveBeenCalledWith("/login");
    });

    it("handles theme toggle", async () => {
      const { user } = renderWithProviders(<ExampleComponent />);

      await user.click(screen.getByText("Toggle Theme (light)"));

      expect(themeMocks.mockToggleTheme).toHaveBeenCalled();
    });
  });

  describe("API Mocking", () => {
    it("handles successful API response", async () => {
      // Mock a successful API response
      mockFetch.mockResolvedValueOnce(
        mockApiSuccess({
          data: { message: "Success!" },
        }),
      );

      // Component that makes API call
      const response = await fetch("/api/test");
      const data = await response.json();

      expect(data.data.message).toBe("Success!");
      expect(mockFetch).toHaveBeenCalledWith("/api/test");
    });

    it("handles API error", async () => {
      // Mock an API error
      mockFetch.mockResolvedValueOnce(
        mockApiError("Something went wrong", 500),
      );

      const response = await fetch("/api/test");
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      expect(data.error).toBe("Something went wrong");
    });
  });

  describe("LocalStorage Mocking", () => {
    it("reads from localStorage", () => {
      mockLocalStorage.getItem.mockReturnValue("stored-value");

      const value = localStorage.getItem("test-key");

      expect(value).toBe("stored-value");
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("test-key");
    });

    it("writes to localStorage", () => {
      localStorage.setItem("test-key", "new-value");

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "test-key",
        "new-value",
      );
    });
  });

  describe("Mock Data Creation", () => {
    it("creates mock scenario", () => {
      const scenario = createMockScenario({
        title: { en: "Custom Scenario", zh: "自定義情境" },
        difficulty: "advanced",
      });

      expect(scenario.id).toBe("test-scenario-123");
      expect(scenario.title.en).toBe("Custom Scenario");
      expect(scenario.difficulty).toBe("advanced");
      expect(scenario.mode).toBe("pbl"); // default value
    });

    it("creates mock program", () => {
      const program = createMockProgram({
        totalTaskCount: 10,
        completedTaskCount: 5,
      });

      expect(program.totalTaskCount).toBe(10);
      expect(program.completedTaskCount).toBe(5);
      expect(program.status).toBe("active");
    });

    it("creates mock task", () => {
      const task = createMockTask({
        type: "chat",
        score: 85,
      });

      expect(task.type).toBe("chat");
      expect(task.score).toBe(85);
      expect(task.title.en).toBe("Test Task");
    });
  });

  describe("Auth State Changes", () => {
    it("switches from unauthenticated to authenticated", () => {
      const { rerender } = renderWithProviders(<ExampleComponent />);

      // Initially unauthenticated
      expect(screen.getByText("Login")).toBeInTheDocument();

      // Switch to authenticated
      setupAuthenticatedUser(testUsers.teacher);
      rerender(<ExampleComponent />);

      expect(screen.getByText("Welcome, Test Teacher!")).toBeInTheDocument();
    });

    it("switches from authenticated to unauthenticated", () => {
      setupAuthenticatedUser(testUsers.admin);
      const { rerender } = renderWithProviders(<ExampleComponent />);

      // Initially authenticated
      expect(screen.getByText("Welcome, Test Admin!")).toBeInTheDocument();

      // Switch to unauthenticated
      setupUnauthenticatedUser();
      rerender(<ExampleComponent />);

      expect(screen.getByText("Login")).toBeInTheDocument();
    });
  });

  describe("Different User Roles", () => {
    it("tests with student user", () => {
      setupAuthenticatedUser(testUsers.student);
      renderWithProviders(<ExampleComponent />);

      expect(screen.getByText("Welcome, Test Student!")).toBeInTheDocument();
    });

    it("tests with teacher user", () => {
      setupAuthenticatedUser(testUsers.teacher);
      renderWithProviders(<ExampleComponent />);

      expect(screen.getByText("Welcome, Test Teacher!")).toBeInTheDocument();
    });

    it("tests with admin user", () => {
      setupAuthenticatedUser(testUsers.admin);
      renderWithProviders(<ExampleComponent />);

      expect(screen.getByText("Welcome, Test Admin!")).toBeInTheDocument();
    });

    it("tests with custom user", () => {
      const customUser = {
        id: 999,
        email: "custom@example.com",
        role: "custom",
        name: "Custom User",
      };

      setupAuthenticatedUser(customUser);
      renderWithProviders(<ExampleComponent />);

      expect(screen.getByText("Welcome, Custom User!")).toBeInTheDocument();
    });
  });

  describe("Advanced Testing Patterns", () => {
    it("tests async operations with waitFor", async () => {
      const { user } = renderWithProviders(<ExampleComponent />);

      // Simulate async operation
      mockFetch.mockResolvedValueOnce(mockApiSuccess({ loaded: true }));

      // Trigger action that causes async operation
      await user.click(screen.getByText("Login"));

      // Wait for async result
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it("tests error boundaries", () => {
      // Mock console.error to avoid noise in test output
      const consoleError = jest.spyOn(console, "error").mockImplementation();

      // Component that throws error
      const ErrorComponent = () => {
        throw new Error("Test error");
      };

      // Wrap in error boundary if your app has one
      expect(() => {
        renderWithProviders(<ErrorComponent />);
      }).toThrow("Test error");

      consoleError.mockRestore();
    });

    it("tests with multiple providers and custom props", () => {
      const customAuthState = {
        user: testUsers.student,
        isLoggedIn: true,
        isLoading: true, // Custom loading state
      };

      renderWithProviders(<ExampleComponent />, {
        authState: customAuthState,
        theme: "dark",
        route: "/dashboard",
      });

      // Component renders with all custom states
    });
  });
});

/**
 * Best Practices:
 *
 * 1. Always call resetAllMocks() in beforeEach
 * 2. Use setupAuthenticatedUser/setupUnauthenticatedUser for auth state
 * 3. Use renderWithProviders instead of render for components using context
 * 4. Access user from renderWithProviders result for userEvent actions
 * 5. Use mockApiSuccess/mockApiError for consistent API mocking
 * 6. Use createMock* functions for test data to avoid repetition
 * 7. Test different user roles with testUsers constants
 * 8. Use navigationMocks and themeMocks to verify interactions
 * 9. Mock localStorage with mockLocalStorage for storage tests
 * 10. Use waitFor for async operations
 */
