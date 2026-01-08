/**
 * Unit tests for Admin DB Init page
 * Tests administrative database initialization interface
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminDbInitPage from "../page";

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe("AdminDbInitPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock all API responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/api/users")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [], total: 0 }),
        });
      }
      if (url.includes("/api/assessment/scenarios")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [], total: 0 }),
        });
      }
      if (url.includes("/api/pbl/scenarios")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [], total: 0 }),
        });
      }
      if (url.includes("/api/discovery/scenarios")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [], total: 0 }),
        });
      }
      // Default response for init operations
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ success: true, message: "Operation successful" }),
      });
    });
  });

  it("should render the admin DB init interface", async () => {
    render(<AdminDbInitPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Database Initialization Manager"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("Check and initialize database modules for AI Square"),
    ).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Assessment")).toBeInTheDocument();
    expect(screen.getByText("PBL")).toBeInTheDocument();
    expect(screen.getByText("Discovery")).toBeInTheDocument();
  });

  it("should show initialization buttons for empty modules", async () => {
    render(<AdminDbInitPage />);

    await waitFor(() => {
      // Should show 4 module initialization buttons + 1 in instructions text = 5 total
      const initializeButtons = screen.getAllByRole("button", {
        name: "Initialize",
      });
      expect(initializeButtons).toHaveLength(4); // Only the actual buttons, not the text in instructions
    });
  });

  it("should handle assessment initialization", async () => {
    render(<AdminDbInitPage />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: "Initialize" }),
      ).toHaveLength(4);
    });

    const initButtons = screen.getAllByRole("button", { name: "Initialize" });
    fireEvent.click(initButtons[1]); // Assessment is second module

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/init-assessment",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });

  it("should show refresh status button", async () => {
    render(<AdminDbInitPage />);

    await waitFor(() => {
      expect(screen.getByText("Refresh Status")).toBeInTheDocument();
    });
  });

  it("should show loading state during operations", async () => {
    // Mock a delayed response
    let resolvePromise: (value: any) => void;
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/api/admin/init-assessment")) {
        return delayedPromise.then(() => ({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        }));
      }
      // Default status check responses
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [], total: 0 }),
      });
    });

    render(<AdminDbInitPage />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: "Initialize" }),
      ).toHaveLength(4);
    });

    const initButtons = screen.getAllByRole("button", { name: "Initialize" });
    fireEvent.click(initButtons[1]); // Assessment module

    // Should show that the button is disabled during loading
    expect(initButtons[1]).toBeDisabled();

    // Resolve the promise
    resolvePromise!({});
  });

  it("should handle initialization errors", async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/api/admin/init-assessment")) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Initialization failed" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [], total: 0 }),
      });
    });

    render(<AdminDbInitPage />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: "Initialize" }),
      ).toHaveLength(4);
    });

    const initButtons = screen.getAllByRole("button", { name: "Initialize" });
    fireEvent.click(initButtons[1]);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to initialize assessment/),
      ).toBeInTheDocument();
    });
  });

  it("should show success message after successful initialization", async () => {
    render(<AdminDbInitPage />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: "Initialize" }),
      ).toHaveLength(4);
    });

    const initButtons = screen.getAllByRole("button", { name: "Initialize" });
    fireEvent.click(initButtons[1]);

    await waitFor(() => {
      expect(
        screen.getByText(/assessment initialized successfully/),
      ).toBeInTheDocument();
    });
  });

  it("should show empty status for modules initially", async () => {
    render(<AdminDbInitPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Empty")).toHaveLength(4);
    });
  });

  it("should show instructions section", async () => {
    render(<AdminDbInitPage />);

    await waitFor(() => {
      expect(screen.getByText("Instructions:")).toBeInTheDocument();
    });

    // Check for basic instruction content
    expect(
      screen.getByText(/Use.*Refresh Status.*to check current database state/),
    ).toBeInTheDocument();
  });

  it("should handle refresh status action", async () => {
    render(<AdminDbInitPage />);

    await waitFor(() => {
      expect(screen.getByText("Refresh Status")).toBeInTheDocument();
    });

    const refreshButton = screen.getByText("Refresh Status");
    fireEvent.click(refreshButton);

    // Should call status APIs again
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/users");
    });
  });
});
