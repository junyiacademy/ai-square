import * as abstractions from "../index";

describe("Abstractions Index", () => {
  it("should export BaseLearningService", () => {
    expect(abstractions.BaseLearningService).toBeDefined();
  });

  it("should export cacheService", () => {
    expect(abstractions.cacheService).toBeDefined();
  });

  it("should export error tracking functions", () => {
    expect(abstractions.captureError).toBeDefined();
    expect(abstractions.captureApiError).toBeDefined();
    expect(abstractions.captureUserError).toBeDefined();
  });

  it("should export functions as expected types", () => {
    expect(typeof abstractions.captureError).toBe("function");
    expect(typeof abstractions.captureApiError).toBe("function");
    expect(typeof abstractions.captureUserError).toBe("function");
  });

  it("should export cacheService as an object", () => {
    expect(typeof abstractions.cacheService).toBe("object");
  });
});
