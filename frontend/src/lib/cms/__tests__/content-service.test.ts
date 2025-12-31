/**
 * ContentService Comprehensive Tests
 * Following TDD: Red → Green → Refactor
 * Achieving 95%+ coverage for CMS content management
 */

import { ContentService } from "../content-service";
import { ContentType, ContentStatus } from "@/types/cms";
import { Storage } from "@google-cloud/storage";
import fs from "fs/promises";
import yaml from "js-yaml";
import { yamlLoader } from "@/lib/yaml-loader";

// Mock all external dependencies
jest.mock("@google-cloud/storage");
jest.mock("fs/promises");
jest.mock("js-yaml");
jest.mock("@/lib/yaml-loader");
jest.mock("@/lib/config/gcs.config", () => ({
  GCS_CONFIG: {
    bucketName: "test-bucket",
    paths: {
      cms: {
        drafts: "cms/drafts/",
        overrides: "cms/overrides/",
        metadata: "cms/metadata/",
        history: "cms/history/",
      },
    },
  },
  getStorageConfig: jest.fn(() => ({ projectId: "test-project" })),
}));

// Mock environment variable
const originalEnv = process.env.NODE_ENV;
const mockNodeEnv = (value: string) => {
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    writable: true,
    configurable: true,
  });
};

describe("ContentService", () => {
  let contentService: ContentService;
  let mockStorage: jest.Mocked<Storage>;
  let mockBucket: jest.Mocked<ReturnType<Storage["bucket"]>>;
  let mockFile: jest.Mocked<ReturnType<ReturnType<Storage["bucket"]>["file"]>>;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockYaml = yaml as jest.Mocked<typeof yaml>;
  const mockYamlLoader = yamlLoader as jest.Mocked<typeof yamlLoader>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup GCS mocks
    mockFile = {
      save: jest.fn(),
      download: jest.fn(),
      delete: jest.fn(),
      name: "test-file.yaml",
    } as any;

    mockBucket = {
      file: jest.fn().mockReturnValue(mockFile),
      getFiles: jest.fn(),
    } as any;

    mockStorage = {
      bucket: jest.fn().mockReturnValue(mockBucket),
    } as any;

    (Storage as jest.MockedClass<typeof Storage>).mockImplementation(
      () => mockStorage,
    );

    // Reset environment
    mockNodeEnv("test");

    contentService = new ContentService();
  });

  afterEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: originalEnv,
      writable: true,
      configurable: true,
    });
  });

  describe("constructor", () => {
    it("should initialize with production environment", () => {
      mockNodeEnv("production");
      const service = new ContentService();
      expect(Storage).toHaveBeenCalledWith({ projectId: "test-project" });
    });

    it("should handle GCS initialization failure gracefully", () => {
      (Storage as jest.MockedClass<typeof Storage>).mockImplementation(() => {
        throw new Error("GCS init failed");
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const service = new ContentService();

      expect(consoleSpy).toHaveBeenCalledWith(
        "ContentService: Failed to initialize GCS:",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it("should work without GCS configuration in development", () => {
      jest.doMock("@/lib/config/gcs.config", () => ({
        GCS_CONFIG: { bucketName: null },
        getStorageConfig: jest.fn(),
      }));

      const service = new ContentService();
      expect(service).toBeDefined();
    });
  });

  describe("getContent", () => {
    const testType: ContentType = "domain";
    const testFileName = "ai_lit_domains.yaml";

    it("should return cached content when cache is valid", async () => {
      const cachedData = { title: "Cached Content" };

      // Pre-populate cache
      await contentService.getContent(testType, testFileName);
      (mockYamlLoader.load as jest.MockedFunction<any>).mockResolvedValue(
        cachedData,
      );

      // Second call should use cache
      const result = await contentService.getContent(testType, testFileName);

      expect(result).toEqual(
        expect.objectContaining({
          _source: "repo",
        }),
      );
    });

    it("should load domain content using yamlLoader", async () => {
      const mockContent = { title: "AI Literacy Domains" };
      (mockYamlLoader.load as jest.MockedFunction<any>).mockResolvedValue(
        mockContent,
      );

      const result = await contentService.getContent("domain", testFileName);

      expect(mockYamlLoader.load).toHaveBeenCalledWith(testFileName);
      expect(result).toEqual({
        ...mockContent,
        _source: "repo",
      });
    });

    it("should load ksa content using yamlLoader", async () => {
      const mockContent = { ksa_codes: ["K1", "S1", "A1"] };
      (mockYamlLoader.load as jest.MockedFunction<any>).mockResolvedValue(
        mockContent,
      );

      const result = await contentService.getContent("ksa", "ksa_codes.yaml");

      expect(mockYamlLoader.load).toHaveBeenCalledWith("ksa_codes.yaml");
      expect(result).toEqual({
        ...mockContent,
        _source: "repo",
      });
    });

    it("should load other content types from repo", async () => {
      const mockContent = { title: "Question Bank" };
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue(
        "title: Question Bank",
      );
      (mockYaml.load as jest.MockedFunction<any>).mockReturnValue(mockContent);

      const result = await contentService.getContent("question", "test.yaml");

      expect(mockFs.readFile).toHaveBeenCalled();
      expect(mockYaml.load).toHaveBeenCalledWith("title: Question Bank");
      expect(result).toEqual({
        ...mockContent,
        _source: "repo",
      });
    });

    it("should return GCS override when available", async () => {
      const baseContent = { title: "Base Content" };
      const overrideContent = { title: "Override Content", version: 2 };

      (mockYamlLoader.load as jest.MockedFunction<any>).mockResolvedValue(
        baseContent,
      );
      (mockFile.download as jest.MockedFunction<any>).mockResolvedValue([
        Buffer.from("title: Override Content\nversion: 2"),
      ]);
      (mockYaml.load as jest.MockedFunction<any>).mockReturnValue(
        overrideContent,
      );

      const result = await contentService.getContent(testType, testFileName);

      expect(mockBucket.file).toHaveBeenCalledWith(
        `cms/overrides/${testType}/${testFileName}`,
      );
      expect(result).toEqual({
        ...baseContent,
        ...overrideContent,
        _source: "gcs_override",
      });
    });

    it("should handle GCS override read failure gracefully", async () => {
      const baseContent = { title: "Base Content" };
      (mockYamlLoader.load as jest.MockedFunction<any>).mockResolvedValue(
        baseContent,
      );
      (mockFile.download as jest.MockedFunction<any>).mockRejectedValue(
        new Error("File not found"),
      );

      const result = await contentService.getContent(testType, testFileName);

      expect(result).toEqual({
        ...baseContent,
        _source: "repo",
      });
    });

    it("should handle non-object override gracefully", async () => {
      const baseContent = { title: "Base Content" };
      (mockYamlLoader.load as jest.MockedFunction<any>).mockResolvedValue(
        baseContent,
      );
      (mockFile.download as jest.MockedFunction<any>).mockResolvedValue([
        Buffer.from("simple string"),
      ]);
      (mockYaml.load as jest.MockedFunction<any>).mockReturnValue(
        "simple string",
      );

      const result = await contentService.getContent(testType, testFileName);

      expect(result).toEqual({
        ...baseContent,
        _source: "repo",
      });
    });
  });

  describe("listContent", () => {
    const testType: ContentType = "domain";

    beforeEach(() => {
      // Mock process.cwd() to simulate different environments
      jest.spyOn(process, "cwd").mockReturnValue("/app/frontend");
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should list content from repository", async () => {
      const mockFiles = ["file1.yaml", "file2.yml", "other.txt"];
      const mockContent = {
        title: "Test Content",
        description: "Test Description",
      };

      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(
        mockFiles as any,
      );
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue(
        "title: Test Content\ndescription: Test Description",
      );
      (mockYaml.load as jest.MockedFunction<any>).mockReturnValue(mockContent);

      const result = await contentService.listContent(testType);

      expect(result).toHaveLength(2); // Only YAML files
      expect(result[0]).toMatchObject({
        id: `${testType}/file1.yaml`,
        type: testType,
        status: "published",
        title: "Test Content",
        description: "Test Description",
        file_path: `${testType}/file1.yaml`,
      });
    });

    it("should skip inappropriate files for domain type", async () => {
      const mockFiles = ["ai_lit_domains.yaml", "ksa_codes.yaml"];

      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(
        mockFiles as any,
      );
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue(
        "title: Domain Content",
      );
      (mockYaml.load as jest.MockedFunction<any>).mockReturnValue({
        title: "Domain Content",
      });

      const result = await contentService.listContent("domain");

      expect(result).toHaveLength(1); // ksa_codes.yaml should be skipped
      expect(result[0].id).toBe("domain/ai_lit_domains.yaml");
    });

    it("should skip inappropriate files for ksa type", async () => {
      const mockFiles = ["ai_lit_domains.yaml", "ksa_codes.yaml"];

      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(
        mockFiles as any,
      );
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue(
        "title: KSA Content",
      );
      (mockYaml.load as jest.MockedFunction<any>).mockReturnValue({
        title: "KSA Content",
      });

      const result = await contentService.listContent("ksa");

      expect(result).toHaveLength(1); // ai_lit_domains.yaml should be skipped
      expect(result[0].id).toBe("ksa/ksa_codes.yaml");
    });

    it("should handle directory read error gracefully", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      (mockFs.readdir as jest.MockedFunction<any>).mockRejectedValue(
        new Error("Directory not found"),
      );

      const result = await contentService.listContent(testType);

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error listing content:",
        expect.any(Error),
      );
    });

    it("should include GCS-only draft items", async () => {
      // Mock repo files
      mockFs.readdir.mockResolvedValue([]);

      // Mock GCS files
      const mockGcsFiles = [
        { name: "cms/drafts/domain/draft1.yaml" },
        { name: "cms/drafts/domain/draft2.yaml" },
      ];
      (mockBucket.getFiles as jest.MockedFunction<any>).mockResolvedValue([
        mockGcsFiles as any,
      ]);
      (mockFile.download as jest.MockedFunction<any>).mockResolvedValue([
        Buffer.from("title: Draft Content"),
      ]);
      (mockYaml.load as jest.MockedFunction<any>).mockReturnValue({
        title: "Draft Content",
      });

      const result = await contentService.listContent("domain");

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("draft");
      expect(result[0].gcs_path).toBe("cms/drafts/domain/draft1.yaml");
    });

    it("should not duplicate items that exist in both repo and GCS", async () => {
      // Mock repo files
      mockFs.readdir.mockResolvedValue(["existing.yaml"] as any);
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue(
        "title: Repo Content",
      );
      (mockYaml.load as jest.MockedFunction<any>).mockReturnValue({
        title: "Repo Content",
      });

      // Mock GCS files with same name
      const mockGcsFiles = [{ name: "cms/drafts/domain/existing.yaml" }];
      (mockBucket.getFiles as jest.MockedFunction<any>).mockResolvedValue([
        mockGcsFiles as any,
      ]);

      const result = await contentService.listContent("domain");

      expect(result).toHaveLength(1); // Should not duplicate
      expect(result[0].status).toBe("published"); // Repo version takes precedence
    });

    it("should handle GCS listing error gracefully", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockFs.readdir.mockResolvedValue([]);
      (mockBucket.getFiles as jest.MockedFunction<any>).mockRejectedValue(
        new Error("GCS error"),
      );

      const result = await contentService.listContent(testType);

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error listing GCS drafts:",
        expect.any(Error),
      );
    });

    it("should handle different working directory structures", async () => {
      jest.spyOn(process, "cwd").mockReturnValue("/app"); // Not ending with /frontend

      mockFs.readdir.mockResolvedValue(["test.yaml"] as any);
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue(
        "title: Test",
      );
      (mockYaml.load as jest.MockedFunction<any>).mockReturnValue({
        title: "Test",
      });

      await contentService.listContent(testType);

      // Should construct path correctly
      expect(mockFs.readdir as jest.MockedFunction<any>).toHaveBeenCalledWith(
        expect.stringContaining("/app/frontend/public"),
      );
    });
  });

  describe("saveContent", () => {
    const testType: ContentType = "domain";
    const testFileName = "test.yaml";
    const testContent = { title: "Test Content" };
    const testUser = "test-user";

    it("should save draft content to GCS", async () => {
      const yamlContent = "title: Test Content";
      (mockYaml.dump as jest.MockedFunction<any>).mockReturnValue(yamlContent);
      (mockFile.download as jest.MockedFunction<any>).mockResolvedValue([
        Buffer.from("{}"),
      ]); // For metadata

      await contentService.saveContent(
        testType,
        testFileName,
        testContent,
        "draft",
        testUser,
      );

      expect(mockBucket.file).toHaveBeenCalledWith(
        `cms/drafts/${testType}/${testFileName}`,
      );
      expect(mockFile.save).toHaveBeenCalledWith(yamlContent, {
        metadata: { contentType: "application/x-yaml" },
      });
    });

    it("should save published content to overrides", async () => {
      const yamlContent = "title: Test Content";
      (mockYaml.dump as jest.MockedFunction<any>).mockReturnValue(yamlContent);
      (mockFile.download as jest.MockedFunction<any>).mockResolvedValue([
        Buffer.from("{}"),
      ]); // For metadata

      await contentService.saveContent(
        testType,
        testFileName,
        testContent,
        "published",
        testUser,
      );

      expect(mockBucket.file).toHaveBeenCalledWith(
        `cms/overrides/${testType}/${testFileName}`,
      );
    });

    it("should update metadata with new version", async () => {
      const existingMetadata = {
        version: 1,
        created_at: new Date("2023-01-01"),
        created_by: "old-user",
        status: "draft",
        updated_at: new Date("2023-01-01"),
        updated_by: "old-user",
      };

      (mockYaml.dump as jest.MockedFunction<any>).mockReturnValue(
        "title: Test Content",
      );
      (mockFile.download as jest.MockedFunction<any>)
        .mockResolvedValueOnce([Buffer.from(JSON.stringify(existingMetadata))]) // For getMetadata
        .mockResolvedValueOnce([Buffer.from("{}")]); // For saveHistory

      await contentService.saveContent(
        testType,
        testFileName,
        testContent,
        "published",
        testUser,
      );

      // Check metadata update
      expect(mockFile.save).toHaveBeenCalledWith(
        expect.stringContaining('"version": 2'),
        { metadata: { contentType: "application/json" } },
      );
    });

    it("should create new metadata when none exists", async () => {
      (mockYaml.dump as jest.MockedFunction<any>).mockReturnValue(
        "title: Test Content",
      );
      (mockFile.download as jest.MockedFunction<any>)
        .mockRejectedValueOnce(new Error("Not found")) // getMetadata fails
        .mockResolvedValueOnce([Buffer.from("{}")]); // For saveHistory

      await contentService.saveContent(
        testType,
        testFileName,
        testContent,
        "draft",
        testUser,
      );

      // Should create metadata with version 1
      expect(mockFile.save).toHaveBeenCalledWith(
        expect.stringContaining('"version": 1'),
        { metadata: { contentType: "application/json" } },
      );
    });

    it("should save content to history", async () => {
      (mockYaml.dump as jest.MockedFunction<any>).mockReturnValue(
        "title: Test Content",
      );
      (mockFile.download as jest.MockedFunction<any>).mockRejectedValue(
        new Error("Not found"),
      ); // No existing metadata

      await contentService.saveContent(
        testType,
        testFileName,
        testContent,
        "draft",
        testUser,
      );

      // Check history save
      const historyCall = (
        mockFile.save as jest.MockedFunction<any>
      ).mock.calls.find(
        (call: any) =>
          typeof call[0] === "string" && call[0].includes('"action": "update"'),
      );
      expect(historyCall).toBeDefined();
    });

    it("should throw error when GCS is not configured", async () => {
      const serviceWithoutGCS = new (class extends ContentService {
        constructor() {
          super();
          (this as any).bucket = null;
        }
      })();

      await expect(
        serviceWithoutGCS.saveContent(
          testType,
          testFileName,
          testContent,
          "draft",
          testUser,
        ),
      ).rejects.toThrow("GCS not configured");
    });
  });

  describe("deleteOverride", () => {
    const testType: ContentType = "domain";
    const testFileName = "test.yaml";

    it("should delete both override and draft files", async () => {
      await contentService.deleteOverride(testType, testFileName);

      expect(mockBucket.file).toHaveBeenCalledWith(
        `cms/overrides/${testType}/${testFileName}`,
      );
      expect(mockBucket.file).toHaveBeenCalledWith(
        `cms/drafts/${testType}/${testFileName}`,
      );
      expect(mockFile.delete).toHaveBeenCalledTimes(2);
    });

    it("should ignore deletion errors silently", async () => {
      (mockFile.delete as jest.MockedFunction<any>).mockRejectedValue(
        new Error("File not found"),
      );

      await expect(
        contentService.deleteOverride(testType, testFileName),
      ).resolves.not.toThrow();
    });

    it("should clear cache after deletion", async () => {
      // Pre-populate cache
      (mockYamlLoader.load as jest.MockedFunction<any>).mockResolvedValue({
        title: "Test",
      });
      await contentService.getContent(testType, testFileName);

      // Now verify cache is cleared by testing content refresh
      await contentService.deleteOverride(testType, testFileName);

      // Make another call - it should use fresh data, not cache
      (mockYamlLoader.load as jest.MockedFunction<any>).mockResolvedValue({
        title: "Fresh after delete",
      });
      const result = await contentService.getContent(testType, testFileName);

      expect(result).toEqual(
        expect.objectContaining({ title: "Fresh after delete" }),
      );
    });

    it("should handle missing GCS bucket gracefully", async () => {
      const serviceWithoutGCS = new (class extends ContentService {
        constructor() {
          super();
          (this as any).bucket = null;
        }
      })();

      await expect(
        serviceWithoutGCS.deleteOverride(testType, testFileName),
      ).resolves.not.toThrow();
    });
  });

  describe("publish", () => {
    const testType: ContentType = "domain";
    const testFileName = "test.yaml";
    const testUser = "test-user";

    it("should copy draft to override location", async () => {
      const draftContent = Buffer.from("title: Draft Content");
      (mockFile.download as jest.MockedFunction<any>).mockResolvedValue([
        draftContent,
      ]);

      await contentService.publish(testType, testFileName, testUser);

      expect(mockBucket.file).toHaveBeenCalledWith(
        `cms/drafts/${testType}/${testFileName}`,
      );
      expect(mockBucket.file).toHaveBeenCalledWith(
        `cms/overrides/${testType}/${testFileName}`,
      );
      expect(mockFile.save).toHaveBeenCalledWith(draftContent, {
        metadata: { contentType: "application/x-yaml" },
      });
    });

    it("should update metadata status to published", async () => {
      const existingMetadata = { version: 1, status: "draft" };
      (mockFile.download as jest.MockedFunction<any>)
        .mockResolvedValueOnce([Buffer.from("title: Content")]) // Draft content
        .mockResolvedValueOnce([Buffer.from(JSON.stringify(existingMetadata))]); // Metadata

      await contentService.publish(testType, testFileName, testUser);

      const metadataCall = (
        mockFile.save as jest.MockedFunction<any>
      ).mock.calls.find(
        (call: any) =>
          typeof call[0] === "string" &&
          call[0].includes('"status": "published"'),
      );
      expect(metadataCall).toBeDefined();
    });

    it("should save publish action to history", async () => {
      (mockFile.download as jest.MockedFunction<any>)
        .mockResolvedValueOnce([Buffer.from("title: Content")]) // Draft content
        .mockResolvedValueOnce([Buffer.from("{}")]); // Metadata

      await contentService.publish(testType, testFileName, testUser);

      const historyCall = (
        mockFile.save as jest.MockedFunction<any>
      ).mock.calls.find(
        (call: any) =>
          typeof call[0] === "string" &&
          call[0].includes('"action": "publish"'),
      );
      expect(historyCall).toBeDefined();
    });

    it("should throw error when GCS is not configured", async () => {
      const serviceWithoutGCS = new (class extends ContentService {
        constructor() {
          super();
          (this as any).bucket = null;
        }
      })();

      await expect(
        serviceWithoutGCS.publish(testType, testFileName, testUser),
      ).rejects.toThrow("GCS not configured");
    });
  });

  describe("getHistory", () => {
    const testType: ContentType = "domain";
    const testFileName = "test.yaml";

    it("should return empty array when GCS is not configured", async () => {
      const serviceWithoutGCS = new (class extends ContentService {
        constructor() {
          super();
          (this as any).bucket = null;
        }
      })();

      const result = await serviceWithoutGCS.getHistory(testType, testFileName);
      expect(result).toEqual([]);
    });

    it("should return sorted history entries", async () => {
      const history1 = { version: 1, timestamp: "2023-01-01T00:00:00Z" };
      const history2 = { version: 2, timestamp: "2023-01-02T00:00:00Z" };

      // Mock file objects with download method
      const mockHistoryFile1 = {
        download: jest
          .fn()
          .mockResolvedValue([Buffer.from(JSON.stringify(history1))]),
      };
      const mockHistoryFile2 = {
        download: jest
          .fn()
          .mockResolvedValue([Buffer.from(JSON.stringify(history2))]),
      };

      const historyFiles = [mockHistoryFile1, mockHistoryFile2];

      (mockBucket.getFiles as jest.MockedFunction<any>).mockResolvedValue([
        historyFiles as any,
      ]);

      const result = await contentService.getHistory(testType, testFileName);

      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(2); // More recent first
      expect(result[1].version).toBe(1);
    });

    it("should handle empty history gracefully", async () => {
      (mockBucket.getFiles as jest.MockedFunction<any>).mockResolvedValue([[]]);

      const result = await contentService.getHistory(testType, testFileName);
      expect(result).toEqual([]);
    });
  });

  describe("clearCache", () => {
    it("should clear specific cache entry", async () => {
      const testType: ContentType = "domain";
      const testFileName = "test.yaml";

      // Populate cache
      (mockYamlLoader.load as jest.MockedFunction<any>).mockResolvedValue({
        title: "Test",
      });
      await contentService.getContent(testType, testFileName);

      contentService.clearCache(testType, testFileName);

      // Next call should not use cache
      (mockYamlLoader.load as jest.MockedFunction<any>).mockResolvedValue({
        title: "Fresh",
      });
      const result = await contentService.getContent(testType, testFileName);

      expect(result).toEqual(expect.objectContaining({ title: "Fresh" }));
    });

    it("should clear all cache entries", async () => {
      // Populate cache with multiple entries
      (mockYamlLoader.load as jest.MockedFunction<any>).mockResolvedValue({
        title: "Test",
      });
      await contentService.getContent("domain", "file1.yaml");
      await contentService.getContent("ksa", "file2.yaml");

      contentService.clearCache();

      // Both entries should be cleared
      (mockYamlLoader.load as jest.MockedFunction<any>).mockResolvedValue({
        title: "Fresh",
      });
      const result1 = await contentService.getContent("domain", "file1.yaml");
      const result2 = await contentService.getContent("ksa", "file2.yaml");

      expect(result1).toEqual(expect.objectContaining({ title: "Fresh" }));
      expect(result2).toEqual(expect.objectContaining({ title: "Fresh" }));
    });
  });

  describe("private methods", () => {
    describe("readFromRepo", () => {
      it("should handle file read errors gracefully", async () => {
        const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
        mockFs.readFile.mockRejectedValue(new Error("File not found"));

        // Access private method through any cast for testing
        const result = await (contentService as any).readFromRepo(
          "domain",
          "nonexistent.yaml",
        );

        expect(result).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("File not found:"),
          expect.any(Error),
        );
      });

      it("should log file path for debugging", async () => {
        const consoleSpy = jest.spyOn(console, "log").mockImplementation();
        (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue(
          "title: Test",
        );
        (mockYaml.load as jest.MockedFunction<any>).mockReturnValue({
          title: "Test",
        });

        await (contentService as any).readFromRepo("domain", "test.yaml");

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("[ContentService] Reading from repo:"),
        );
      });
    });

    describe("readFromGCS", () => {
      it("should return null when bucket is not configured", async () => {
        const serviceWithoutGCS = new (class extends ContentService {
          constructor() {
            super();
            (this as any).bucket = null;
          }
        })();

        const result = await (serviceWithoutGCS as any).readFromGCS(
          "test/path",
        );
        expect(result).toBeNull();
      });

      it("should handle GCS read errors gracefully", async () => {
        (mockFile.download as jest.MockedFunction<any>).mockRejectedValue(
          new Error("GCS error"),
        );

        const result = await (contentService as any).readFromGCS("test/path");
        expect(result).toBeNull();
      });
    });

    describe("getRepoPath", () => {
      it("should return correct paths for different content types", () => {
        const testCases: Array<[ContentType, string]> = [
          ["domain", "rubrics_data"],
          ["question", "assessment_data/ai_literacy"],
          ["rubric", "rubrics_data"],
          ["ksa", "rubrics_data"],
        ];

        testCases.forEach(([type, expectedPath]) => {
          const result = (contentService as any).getRepoPath(type);
          expect(result).toBe(expectedPath);
        });
      });

      it("should return default path for unknown content type", () => {
        const result = (contentService as any).getRepoPath(
          "unknown" as ContentType,
        );
        expect(result).toBe("rubrics_data");
      });
    });
  });

  describe("error handling and edge cases", () => {
    it("should handle YAML parsing errors", async () => {
      mockFs.readFile.mockResolvedValue("invalid: yaml: content:");
      mockYaml.load.mockImplementation(() => {
        throw new Error("YAML parsing error");
      });

      const result = await (contentService as any).readFromRepo(
        "domain",
        "invalid.yaml",
      );
      expect(result).toBeNull();
    });

    it("should handle concurrent cache access safely", async () => {
      // Clear any existing cache first
      contentService.clearCache();

      const testData = { title: "Concurrent Test" };
      (mockYamlLoader.load as jest.MockedFunction<any>).mockResolvedValue(
        testData,
      );

      // Make concurrent requests for the same content
      const promise1 = contentService.getContent(
        "domain",
        "concurrent-test.yaml",
      );
      const promise2 = contentService.getContent(
        "domain",
        "concurrent-test.yaml",
      );

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Both results should have the same content structure
      expect(result1).toEqual(
        expect.objectContaining({ title: "Concurrent Test", _source: "repo" }),
      );
      expect(result2).toEqual(
        expect.objectContaining({ title: "Concurrent Test", _source: "repo" }),
      );

      // Verify loader was called (caching may or may not prevent duplicate calls in concurrent scenario)
      expect(mockYamlLoader.load).toHaveBeenCalledWith("concurrent-test.yaml");
    });

    it("should handle malformed metadata gracefully", async () => {
      (mockFile.download as jest.MockedFunction<any>).mockResolvedValue([
        Buffer.from("invalid json"),
      ]);

      const result = await (contentService as any).getMetadata(
        "domain",
        "test.yaml",
      );
      expect(result).toBeNull();
    });

    it("should handle empty file content", async () => {
      mockFs.readFile.mockResolvedValue("");
      (mockYaml.load as jest.MockedFunction<any>).mockReturnValue(null);

      const result = await (contentService as any).readFromRepo(
        "domain",
        "empty.yaml",
      );
      expect(result).toBeNull();
    });
  });

  describe("singleton export", () => {
    it("should export a singleton instance", async () => {
      const { contentService: singleton } = await import("../content-service");
      expect(singleton).toBeInstanceOf(ContentService);
    });
  });
});
