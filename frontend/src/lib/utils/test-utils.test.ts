// Test utility functions
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function mockConsole() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
  };

  const restore = () => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
  };

  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();

  return { restore };
}

export function createMockFile(name: string, size: number, type: string): File {
  const file = new File(["a".repeat(size)], name, { type });
  return file;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Tests for the utility functions
describe("Test Utils", () => {
  describe("delay", () => {
    it("should delay execution", async () => {
      const start = Date.now();
      await delay(100);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(90);
    });
  });

  describe("mockConsole", () => {
    it("should mock console methods", () => {
      const { restore } = mockConsole();

      console.log("test");
      console.error("error");
      console.warn("warn");

      expect(console.log).toHaveBeenCalledWith("test");
      expect(console.error).toHaveBeenCalledWith("error");
      expect(console.warn).toHaveBeenCalledWith("warn");

      restore();
    });
  });

  describe("createMockFile", () => {
    it("should create a mock file", () => {
      const file = createMockFile("test.txt", 100, "text/plain");

      expect(file.name).toBe("test.txt");
      expect(file.size).toBe(100);
      expect(file.type).toBe("text/plain");
    });
  });

  describe("generateId", () => {
    it("should generate unique ids", () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).not.toBe(id2);
      expect(id1.length).toBeGreaterThan(0);
    });
  });
});
