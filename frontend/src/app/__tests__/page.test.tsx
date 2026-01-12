import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Home from "../page";

// Mock next/dynamic to handle dynamic imports in tests
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: (fn: () => Promise<{ default: React.ComponentType }>) => {
    const MockedComponent = () => {
      const [Component, setComponent] =
        React.useState<React.ComponentType | null>(null);
      React.useEffect(() => {
        fn().then((mod) => setComponent(() => mod.default));
      }, []);
      if (!Component) return null;
      return <Component />;
    };
    return MockedComponent;
  },
}));

// Mock all the components
jest.mock("@/components/homepage/HeroSection", () => {
  return function MockHeroSection() {
    return <div data-testid="hero-section">Hero Section</div>;
  };
});

jest.mock("@/components/homepage/FeaturesSection", () => {
  return function MockFeaturesSection() {
    return <div data-testid="features-section">Features Section</div>;
  };
});

jest.mock("@/components/homepage/KnowledgeGraph", () => {
  return function MockKnowledgeGraph() {
    return <div data-testid="knowledge-graph">Knowledge Graph</div>;
  };
});

jest.mock("@/components/homepage/HowItWorksSection", () => {
  return function MockHowItWorksSection() {
    return <div data-testid="how-it-works-section">How It Works Section</div>;
  };
});

jest.mock("@/components/homepage/TargetAudienceSection", () => {
  return function MockTargetAudienceSection() {
    return (
      <div data-testid="target-audience-section">Target Audience Section</div>
    );
  };
});

jest.mock("@/components/homepage/CTASection", () => {
  return function MockCTASection() {
    return <div data-testid="cta-section">CTA Section</div>;
  };
});

describe("Home Page", () => {
  it("renders all homepage sections", async () => {
    render(<Home />);

    // Check that all sections are rendered
    expect(screen.getByTestId("hero-section")).toBeInTheDocument();
    expect(screen.getByTestId("features-section")).toBeInTheDocument();
    // KnowledgeGraph is dynamically imported, wait for it
    await waitFor(() => {
      expect(screen.getByTestId("knowledge-graph")).toBeInTheDocument();
    });
    expect(screen.getByTestId("how-it-works-section")).toBeInTheDocument();
    expect(screen.getByTestId("target-audience-section")).toBeInTheDocument();
    expect(screen.getByTestId("cta-section")).toBeInTheDocument();
  });

  it("renders with correct layout structure", () => {
    const { container } = render(<Home />);

    // Check main element
    const main = container.querySelector("main");
    expect(main).toHaveClass("min-h-screen");

    // Check knowledge graph section has proper styling
    const knowledgeGraphSection = container.querySelector("section.bg-gray-50");
    expect(knowledgeGraphSection).toHaveClass("py-20", "bg-gray-50");

    // Check container div
    const containerDiv = knowledgeGraphSection?.querySelector("div");
    expect(containerDiv).toHaveClass(
      "max-w-7xl",
      "mx-auto",
      "px-4",
      "sm:px-6",
      "lg:px-8",
    );
  });

  it("renders sections in the correct order", () => {
    render(<Home />);

    const sections = screen.getAllByTestId(/section$/);
    const sectionIds = sections.map((section) =>
      section.getAttribute("data-testid"),
    );

    expect(sectionIds).toEqual([
      "hero-section",
      "features-section",
      "knowledge-graph-section",
      "how-it-works-section",
      "target-audience-section",
      "cta-section",
    ]);
  });
});
