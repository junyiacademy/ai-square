import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./ThemeContext";

// Test component
const TestComponent = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
};

describe("ThemeContext", () => {
  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    // Mock document.documentElement.classList
    document.documentElement.classList.add = jest.fn();
    document.documentElement.classList.remove = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should provide theme context", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toBeInTheDocument();
  });

  it("should start with light theme by default", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("should toggle theme", async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    const initialTheme = screen.getByTestId("theme").textContent;
    fireEvent.click(screen.getByText("Toggle"));

    await waitFor(() => {
      const newTheme = screen.getByTestId("theme").textContent;
      expect(newTheme).not.toBe(initialTheme);
    });
  });

  it("should persist theme to localStorage", async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByText("Toggle"));

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "ai-square-theme",
        expect.any(String),
      );
    });
  });

  it("should load theme from localStorage on mount", async () => {
    (localStorage.getItem as jest.Mock).mockReturnValue("dark");

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(localStorage.getItem).toHaveBeenCalledWith("ai-square-theme");
      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    });
  });

  it("should use system preference when no saved theme", async () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
    (window.matchMedia as jest.Mock).mockImplementation((query) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    });
  });

  it("should apply dark class to document element", async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    // Initially light theme
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
      "dark",
    );

    // Toggle to dark
    fireEvent.click(screen.getByText("Toggle"));

    await waitFor(() => {
      expect(document.documentElement.classList.add).toHaveBeenCalledWith(
        "dark",
      );
    });
  });

  it("should remove dark class when switching to light", async () => {
    (localStorage.getItem as jest.Mock).mockReturnValue("dark");

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    });

    fireEvent.click(screen.getByText("Toggle"));

    await waitFor(() => {
      expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
        "dark",
      );
      expect(screen.getByTestId("theme")).toHaveTextContent("light");
    });
  });

  it("should throw error when used outside provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useTheme must be used within a ThemeProvider");

    spy.mockRestore();
  });
});
