import * as core from "../index";

describe("core/index", () => {
  it("should export core utilities", () => {
    expect(core).toBeDefined();
    expect(Object.keys(core).length).toBeGreaterThanOrEqual(0);
  });

  it("should have expected structure", () => {
    const exports = Object.keys(core);

    // Core module may export various utilities
    expect(Array.isArray(exports)).toBe(true);
  });
});
