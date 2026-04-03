import { redirect } from "next/navigation";
import EvaluationPage from "../page";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

describe("Discovery Evaluation Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should redirect to /discovery/scenarios", () => {
    EvaluationPage();
    expect(redirect).toHaveBeenCalledWith("/discovery/scenarios");
  });
});
