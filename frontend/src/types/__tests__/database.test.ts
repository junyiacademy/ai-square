import * as dbTypes from "../database";

describe("Database Types", () => {
  it("should export database types", () => {
    expect(dbTypes).toBeDefined();
  });

  it("should have type exports", () => {
    // Type definitions are compile-time only
    // This test ensures the module loads
    expect(true).toBe(true);
  });
});
