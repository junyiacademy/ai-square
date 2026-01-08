import { render, screen, fireEvent } from "@testing-library/react";
import { TabNavigation } from "../TabNavigation";

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === "complete.results") return "Results";
      if (key === "complete.certificate.title") return "Certificate";
      if (key === "complete.certificate.requireAllTasks")
        return "Complete all tasks";
      return key;
    },
  }),
}));

describe("TabNavigation", () => {
  const mockOnTabChange = jest.fn();

  beforeEach(() => {
    mockOnTabChange.mockClear();
  });

  it("renders both tabs", () => {
    render(
      <TabNavigation
        activeTab="results"
        onTabChange={mockOnTabChange}
        allTasksEvaluated={true}
      />,
    );
    expect(screen.getByText("Results")).toBeInTheDocument();
    expect(screen.getByText("Certificate")).toBeInTheDocument();
  });

  it("highlights active tab", () => {
    render(
      <TabNavigation
        activeTab="results"
        onTabChange={mockOnTabChange}
        allTasksEvaluated={true}
      />,
    );
    const resultsTab = screen.getByText("Results").closest("button");
    expect(resultsTab).toHaveClass("border-purple-500");
  });

  it("calls onTabChange when clicking results tab", () => {
    render(
      <TabNavigation
        activeTab="certificate"
        onTabChange={mockOnTabChange}
        allTasksEvaluated={true}
      />,
    );
    fireEvent.click(screen.getByText("Results"));
    expect(mockOnTabChange).toHaveBeenCalledWith("results");
  });

  it("disables certificate tab when tasks not evaluated", () => {
    render(
      <TabNavigation
        activeTab="results"
        onTabChange={mockOnTabChange}
        allTasksEvaluated={false}
      />,
    );
    const certTab = screen.getByText("Certificate").closest("button");
    expect(certTab).toBeDisabled();
    expect(screen.getByText("🔒")).toBeInTheDocument();
  });

  it("enables certificate tab when all tasks evaluated", () => {
    render(
      <TabNavigation
        activeTab="results"
        onTabChange={mockOnTabChange}
        allTasksEvaluated={true}
      />,
    );
    const certTab = screen.getByText("Certificate").closest("button");
    expect(certTab).not.toBeDisabled();
    fireEvent.click(certTab as HTMLElement);
    expect(mockOnTabChange).toHaveBeenCalledWith("certificate");
  });

  it("does not call onTabChange when clicking disabled certificate tab", () => {
    render(
      <TabNavigation
        activeTab="results"
        onTabChange={mockOnTabChange}
        allTasksEvaluated={false}
      />,
    );
    const certTab = screen.getByText("Certificate").closest("button");
    fireEvent.click(certTab as HTMLElement);
    expect(mockOnTabChange).not.toHaveBeenCalled();
  });
});
