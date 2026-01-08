import { yamlLoader } from "./yaml-loader";
import fs from "fs";
import yaml from "js-yaml";
import path from "path";

jest.mock("fs");
jest.mock("js-yaml");

describe("yamlLoader", () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockYaml = yaml as jest.Mocked<typeof yaml>;
  const originalCwd = process.cwd();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(process, "cwd").mockReturnValue("/test");
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.spyOn(process, "cwd").mockReturnValue(originalCwd);
    jest.restoreAllMocks();
  });

  describe("load", () => {
    it("should load and parse YAML file synchronously", () => {
      const mockContent = "key: value\narray:\n  - item1\n  - item2";
      const mockParsed = { key: "value", array: ["item1", "item2"] };

      (mockFs.readFileSync as jest.Mock).mockReturnValue(mockContent);
      (mockYaml.load as jest.Mock).mockReturnValue(mockParsed);

      const result = yamlLoader.load("test.yaml");

      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        "/test/public/test.yaml",
        "utf8",
      );
      expect(mockYaml.load).toHaveBeenCalledWith(mockContent);
      expect(result).toEqual(mockParsed);
    });

    it("should return null on file read error", () => {
      (mockFs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("File not found");
      });

      const result = yamlLoader.load("nonexistent.yaml");

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Error loading YAML file nonexistent.yaml:",
        expect.any(Error),
      );
    });

    it("should return null on YAML parsing error", () => {
      (mockFs.readFileSync as jest.Mock).mockReturnValue(
        "invalid: yaml: content:",
      );
      (mockYaml.load as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid YAML");
      });

      const result = yamlLoader.load("invalid.yaml");

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it("should handle typed results", () => {
      interface TestType {
        name: string;
        version: number;
      }

      const mockParsed: TestType = { name: "Test", version: 1 };
      (mockFs.readFileSync as jest.Mock).mockReturnValue(
        "name: Test\nversion: 1",
      );
      (mockYaml.load as jest.Mock).mockReturnValue(mockParsed);

      const result = yamlLoader.load<TestType>("typed.yaml");

      expect(result).toEqual(mockParsed);
      expect(result?.name).toBe("Test");
      expect(result?.version).toBe(1);
    });
  });

  describe("loadAsync", () => {
    it("should load and parse YAML file asynchronously", async () => {
      const mockContent = "test: data";
      const mockParsed = { test: "data" };

      if (!mockFs.promises) {
        mockFs.promises = {} as any;
      }
      mockFs.promises.readFile = jest.fn().mockResolvedValue(mockContent);
      (mockYaml.load as jest.Mock).mockReturnValue(mockParsed);

      const result = await yamlLoader.loadAsync("async.yaml");

      expect(mockFs.promises.readFile).toHaveBeenCalledWith(
        "/test/public/async.yaml",
        "utf8",
      );
      expect(result).toEqual(mockParsed);
    });

    it("should return null on async file read error", async () => {
      if (!mockFs.promises) {
        mockFs.promises = {} as any;
      }
      mockFs.promises.readFile = jest
        .fn()
        .mockRejectedValue(new Error("Async error"));

      const result = await yamlLoader.loadAsync("error.yaml");

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it("should handle empty files", async () => {
      if (!mockFs.promises) {
        mockFs.promises = {} as any;
      }
      mockFs.promises.readFile = jest.fn().mockResolvedValue("");
      (mockYaml.load as jest.Mock).mockReturnValue(null);

      const result = await yamlLoader.loadAsync("empty.yaml");

      expect(result).toBeNull();
    });

    it("should handle complex YAML structures", async () => {
      const content = `
        users:
          - name: Alice
            age: 30
          - name: Bob
            age: 25
      `;
      const expected = {
        users: [
          { name: "Alice", age: 30 },
          { name: "Bob", age: 25 },
        ],
      };

      if (!mockFs.promises) {
        mockFs.promises = {} as any;
      }
      mockFs.promises.readFile = jest.fn().mockResolvedValue(content);
      (mockYaml.load as jest.Mock).mockReturnValue(expected);

      const result = await yamlLoader.loadAsync("complex.yaml");

      expect(result).toEqual(expected);
    });

    it("should handle different file paths", async () => {
      if (!mockFs.promises) {
        mockFs.promises = {} as any;
      }
      mockFs.promises.readFile = jest.fn().mockResolvedValue("test: 123");
      (mockYaml.load as jest.Mock).mockReturnValue({ test: 123 });

      await yamlLoader.loadAsync("nested/path/file.yaml");

      expect(mockFs.promises.readFile).toHaveBeenCalledWith(
        "/test/public/nested/path/file.yaml",
        "utf8",
      );
    });
  });
});
