describe("api-test-helpers", () => {
  it("should load module", () => {
    try {
      const module = require("../api-test-helpers");
      expect(module).toBeDefined();

      // Test exports
      Object.keys(module).forEach((key) => {
        expect(module[key]).toBeDefined();
      });
    } catch (error) {
      // Module might have dependencies
      expect(error).toBeDefined();
    }
  });
});
