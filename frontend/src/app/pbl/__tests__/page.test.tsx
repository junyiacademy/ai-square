import { render } from "@testing-library/react";
import { useRouter } from "next/navigation";
import PBLPage from "../page";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("PBLPage", () => {
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
    });
  });

  it("should redirect to /pbl/scenarios", () => {
    render(<PBLPage />);

    expect(mockReplace).toHaveBeenCalledWith("/pbl/scenarios");
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it("should return null (no content)", () => {
    const { container } = render(<PBLPage />);

    expect(container.firstChild).toBeNull();
  });

  it("should use router from useRouter hook", () => {
    render(<PBLPage />);

    expect(useRouter).toHaveBeenCalled();
  });
});
