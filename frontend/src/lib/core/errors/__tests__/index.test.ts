import * as errors from "../index";

describe("errors/index", () => {
  it("should export error classes", () => {
    expect(errors).toBeDefined();
    expect(Object.keys(errors).length).toBeGreaterThan(0);
  });
});
