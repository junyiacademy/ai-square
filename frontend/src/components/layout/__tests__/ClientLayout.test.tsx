import React from "react";
import {
  renderWithProviders,
  screen,
  waitFor,
} from "@/test-utils/helpers/render";
import { ClientLayout } from "../ClientLayout";

// Mock the Header component
jest.mock("../Header", () => ({
  Header: () => <header data-testid="header">Header Content</header>,
}));

// Mock the Footer component
jest.mock("../Footer", () => ({
  Footer: () => <footer data-testid="footer">Footer Content</footer>,
}));

// Mock ThemeProvider
jest.mock("@/contexts/ThemeContext", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

// Mock I18nProvider
jest.mock("@/components/providers/I18nProvider", () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="i18n-provider">{children}</div>
  ),
}));

describe("ClientLayout", () => {
  it("renders children within the layout structure", async () => {
    renderWithProviders(
      <ClientLayout>
        <div data-testid="test-content">Test Content</div>
      </ClientLayout>,
    );

    expect(screen.getByTestId("test-content")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("renders Header component", async () => {
    renderWithProviders(
      <ClientLayout>
        <div>Content</div>
      </ClientLayout>,
    );

    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByText("Header Content")).toBeInTheDocument();
  });

  it("renders Footer component", async () => {
    renderWithProviders(
      <ClientLayout>
        <div>Content</div>
      </ClientLayout>,
    );

    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByText("Footer Content")).toBeInTheDocument();
  });

  it("wraps content with I18nProvider", async () => {
    renderWithProviders(
      <ClientLayout>
        <div>Content</div>
      </ClientLayout>,
    );

    expect(screen.getByTestId("i18n-provider")).toBeInTheDocument();
  });

  it("wraps content with ThemeProvider", async () => {
    renderWithProviders(
      <ClientLayout>
        <div>Content</div>
      </ClientLayout>,
    );

    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
  });

  it("has correct layout structure with proper CSS classes", async () => {
    renderWithProviders(
      <ClientLayout>
        <div data-testid="test-content">Content</div>
      </ClientLayout>,
    );

    // Check the main container structure
    const layoutContainer = screen.getByTestId("test-content").closest(".flex");
    expect(layoutContainer).toHaveClass("flex", "flex-col", "min-h-screen");

    // Check the main content area
    const mainElement = screen.getByRole("main");
    expect(mainElement).toHaveClass(
      "flex-1",
      "bg-white",
      "dark:bg-slate-900",
      "text-gray-900",
      "dark:text-white",
    );
  });

  it("renders multiple children correctly", async () => {
    renderWithProviders(
      <ClientLayout>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
        <span data-testid="child-3">Child 3</span>
      </ClientLayout>,
    );

    expect(screen.getByTestId("child-1")).toBeInTheDocument();
    expect(screen.getByTestId("child-2")).toBeInTheDocument();
    expect(screen.getByTestId("child-3")).toBeInTheDocument();
    expect(screen.getByText("Child 1")).toBeInTheDocument();
    expect(screen.getByText("Child 2")).toBeInTheDocument();
    expect(screen.getByText("Child 3")).toBeInTheDocument();
  });

  it("maintains correct order of layout elements", async () => {
    renderWithProviders(
      <ClientLayout>
        <div data-testid="content">Main Content</div>
      </ClientLayout>,
    );

    const container = screen.getByTestId("content").closest(".flex");
    const children = container?.children;

    if (children) {
      // Should have header, main, and footer in that order
      expect(children.length).toBe(3);
      expect(children[0]).toContainElement(screen.getByTestId("header"));
      expect(children[1]).toBe(screen.getByRole("main"));
      expect(children[2]).toContainElement(screen.getByTestId("footer"));
    }
  });

  it("preserves children props and attributes", async () => {
    const CustomComponent = ({
      className,
      "data-value": dataValue,
    }: {
      className: string;
      "data-value": string;
    }) => (
      <div className={className} data-value={dataValue} data-testid="custom">
        Custom Component
      </div>
    );

    renderWithProviders(
      <ClientLayout>
        <CustomComponent className="custom-class" data-value="test-value" />
      </ClientLayout>,
    );

    const customElement = screen.getByTestId("custom");
    expect(customElement).toHaveClass("custom-class");
    expect(customElement).toHaveAttribute("data-value", "test-value");
    expect(customElement).toHaveTextContent("Custom Component");
  });

  it("handles empty children gracefully", async () => {
    renderWithProviders(
      <ClientLayout>
        {null}
        {undefined}
        {false}
      </ClientLayout>,
    );

    // Layout should still render with header, main, and footer
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("handles React fragments as children", async () => {
    renderWithProviders(
      <ClientLayout>
        <React.Fragment>
          <div data-testid="fragment-child-1">Fragment Child 1</div>
          <div data-testid="fragment-child-2">Fragment Child 2</div>
        </React.Fragment>
      </ClientLayout>,
    );

    expect(screen.getByTestId("fragment-child-1")).toBeInTheDocument();
    expect(screen.getByTestId("fragment-child-2")).toBeInTheDocument();
  });

  it("renders with correct semantic HTML structure", async () => {
    renderWithProviders(
      <ClientLayout>
        <div>Content</div>
      </ClientLayout>,
    );

    // Check for semantic elements
    expect(screen.getByRole("banner")).toBeInTheDocument(); // header
    expect(screen.getByRole("main")).toBeInTheDocument(); // main
    expect(screen.getByRole("contentinfo")).toBeInTheDocument(); // footer
  });
});
