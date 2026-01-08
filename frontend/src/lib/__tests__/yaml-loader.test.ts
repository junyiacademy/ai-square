import { yamlLoader } from "../yaml-loader";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";

// Mock dependencies
jest.mock("fs");
jest.mock("js-yaml");
jest.mock("path");

const mockFs = fs as jest.Mocked<typeof fs>;
const mockYaml = yaml as jest.Mocked<typeof yaml>;
const mockPath = path as jest.Mocked<typeof path>;

// Create a mock for fs.promises
const mockReadFile = jest.fn();
(fs as any).promises = {
  readFile: mockReadFile,
};

describe("YAMLLoader", () => {
  const mockYamlContent = `
domains:
  test_domain:
    name: Test Domain
    description: Test description
`;

  const mockParsedData = {
    domains: {
      test_domain: {
        name: "Test Domain",
        description: "Test description",
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockPath.join.mockImplementation((...args) => args.join("/"));
    process.cwd = jest.fn().mockReturnValue("/test/project");
  });

  describe("load", () => {
    it("should load and parse YAML file successfully", () => {
      mockFs.readFileSync.mockReturnValue(mockYamlContent);
      mockYaml.load.mockReturnValue(mockParsedData);

      const result = yamlLoader.load("test.yaml");

      expect(mockPath.join).toHaveBeenCalledWith(
        "/test/project",
        "public",
        "test.yaml",
      );
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        "/test/project/public/test.yaml",
        "utf8",
      );
      expect(mockYaml.load).toHaveBeenCalledWith(mockYamlContent);
      expect(result).toEqual(mockParsedData);
    });

    it("should return null on file read error", () => {
      const error = new Error("File not found");
      mockFs.readFileSync.mockImplementation(() => {
        throw error;
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = yamlLoader.load("missing.yaml");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error loading YAML file missing.yaml:",
        error,
      );

      consoleSpy.mockRestore();
    });

    it("should return null on YAML parse error", () => {
      mockFs.readFileSync.mockReturnValue("invalid: yaml: content:");
      const error = new Error("Invalid YAML");
      mockYaml.load.mockImplementation(() => {
        throw error;
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = yamlLoader.load("invalid.yaml");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error loading YAML file invalid.yaml:",
        error,
      );

      consoleSpy.mockRestore();
    });

    it("should handle typed returns", () => {
      interface TestData {
        domains: {
          test_domain: {
            name: string;
            description: string;
          };
        };
      }

      mockFs.readFileSync.mockReturnValue(mockYamlContent);
      mockYaml.load.mockReturnValue(mockParsedData);

      const result = yamlLoader.load<TestData>("test.yaml");

      expect(result).toEqual(mockParsedData);
      expect(result?.domains.test_domain.name).toBe("Test Domain");
    });
  });

  describe("loadAsync", () => {
    it("should load and parse YAML file successfully", async () => {
      mockReadFile.mockResolvedValue(mockYamlContent);
      mockYaml.load.mockReturnValue(mockParsedData);

      const result = await yamlLoader.loadAsync("test.yaml");

      expect(mockPath.join).toHaveBeenCalledWith(
        "/test/project",
        "public",
        "test.yaml",
      );
      expect(mockReadFile).toHaveBeenCalledWith(
        "/test/project/public/test.yaml",
        "utf8",
      );
      expect(mockYaml.load).toHaveBeenCalledWith(mockYamlContent);
      expect(result).toEqual(mockParsedData);
    });

    it("should return null on file read error", async () => {
      const error = new Error("File not found");
      mockReadFile.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await yamlLoader.loadAsync("missing.yaml");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error loading YAML file missing.yaml:",
        error,
      );

      consoleSpy.mockRestore();
    });

    it("should return null on YAML parse error", async () => {
      mockReadFile.mockResolvedValue("invalid: yaml: content:");
      const error = new Error("Invalid YAML");
      mockYaml.load.mockImplementation(() => {
        throw error;
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await yamlLoader.loadAsync("invalid.yaml");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error loading YAML file invalid.yaml:",
        error,
      );

      consoleSpy.mockRestore();
    });

    it("should handle typed returns", async () => {
      interface TestData {
        domains: {
          test_domain: {
            name: string;
            description: string;
          };
        };
      }

      mockReadFile.mockResolvedValue(mockYamlContent);
      mockYaml.load.mockReturnValue(mockParsedData);

      const result = await yamlLoader.loadAsync<TestData>("test.yaml");

      expect(result).toEqual(mockParsedData);
      expect(result?.domains.test_domain.name).toBe("Test Domain");
    });
  });

  describe("path handling", () => {
    it("should correctly join paths for load", () => {
      mockFs.readFileSync.mockReturnValue(mockYamlContent);
      mockYaml.load.mockReturnValue(mockParsedData);

      yamlLoader.load("rubrics_data/test.yaml");

      expect(mockPath.join).toHaveBeenCalledWith(
        "/test/project",
        "public",
        "rubrics_data/test.yaml",
      );
    });

    it("should correctly join paths for loadAsync", async () => {
      mockReadFile.mockResolvedValue(mockYamlContent);
      mockYaml.load.mockReturnValue(mockParsedData);

      await yamlLoader.loadAsync("pbl_data/scenario.yaml");

      expect(mockPath.join).toHaveBeenCalledWith(
        "/test/project",
        "public",
        "pbl_data/scenario.yaml",
      );
    });
  });
});
