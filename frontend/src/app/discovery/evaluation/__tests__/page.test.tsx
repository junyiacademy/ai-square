import React from "react";
import { render } from "@testing-library/react";

const mockRedirect = jest.fn();

jest.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

// Import after mocks are set up
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Page = require("../page").default;

describe("Discovery Evaluation Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should redirect to /discovery/scenarios", () => {
    render(<Page />);
    expect(mockRedirect).toHaveBeenCalledWith("/discovery/scenarios");
  });
});
