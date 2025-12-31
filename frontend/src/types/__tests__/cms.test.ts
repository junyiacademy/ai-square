/**
 * Tests for CMS Type Definitions
 * Comprehensive testing of all CMS-related types and interfaces
 */

import type {
  ContentType,
  ContentStatus,
  ContentItem,
  ContentHistory,
  ContentFilter,
  ContentService,
  AdminUser,
  CMSConfig,
} from "../cms";

describe("CMS Types", () => {
  describe("ContentType enum", () => {
    it("should define all content types", () => {
      const validTypes: ContentType[] = ["domain", "question", "rubric", "ksa"];

      validTypes.forEach((type) => {
        expect(["domain", "question", "rubric", "ksa"]).toContain(type);
      });
    });
  });

  describe("ContentStatus enum", () => {
    it("should define all content statuses", () => {
      const validStatuses: ContentStatus[] = ["draft", "published", "archived"];

      validStatuses.forEach((status) => {
        expect(["draft", "published", "archived"]).toContain(status);
      });
    });
  });

  describe("ContentItem interface", () => {
    it("should create valid content item with all required fields", () => {
      const contentItem: ContentItem = {
        id: "content-123",
        type: "domain",
        status: "published",
        version: 1,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-02"),
        created_by: "user-1",
        updated_by: "user-2",
        title: "AI Literacy Domain",
        description: "Core AI literacy competencies",
        content: {
          name: "Engaging with AI",
          competencies: [],
        },
        file_path: "/domains/engaging_with_ai.yaml",
        gcs_path: "gs://content/domains/engaging_with_ai.yaml",
      };

      expect(contentItem.id).toBe("content-123");
      expect(contentItem.type).toBe("domain");
      expect(contentItem.status).toBe("published");
      expect(contentItem.version).toBe(1);
      expect(contentItem.title).toBe("AI Literacy Domain");
      expect(contentItem.file_path).toBe("/domains/engaging_with_ai.yaml");
    });

    it("should allow content item without optional fields", () => {
      const minimalItem: ContentItem = {
        id: "content-456",
        type: "question",
        status: "draft",
        version: 0,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: "user-1",
        updated_by: "user-1",
        title: "Basic Question",
        content: { question: "What is AI?" },
        file_path: "/questions/basic.yaml",
      };

      expect(minimalItem.description).toBeUndefined();
      expect(minimalItem.gcs_path).toBeUndefined();
    });

    it("should handle different content types correctly", () => {
      const rubricItem: ContentItem = {
        id: "rubric-1",
        type: "rubric",
        status: "published",
        version: 2,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: "admin",
        updated_by: "admin",
        title: "Assessment Rubric",
        content: {
          criteria: ["Understanding", "Application", "Analysis"],
          levels: [1, 2, 3, 4, 5],
        },
        file_path: "/rubrics/assessment.yaml",
      };

      expect(rubricItem.type).toBe("rubric");
      expect(rubricItem.content).toHaveProperty("criteria");
    });
  });

  describe("ContentHistory interface", () => {
    it("should track content history with all fields", () => {
      const history: ContentHistory = {
        id: "history-1",
        content_id: "content-123",
        version: 2,
        timestamp: new Date("2024-01-03"),
        user: "editor@example.com",
        action: "update",
        changes: "Updated competency descriptions",
        content_snapshot: {
          title: "Previous Title",
          content: { old: "data" },
        },
      };

      expect(history.id).toBe("history-1");
      expect(history.content_id).toBe("content-123");
      expect(history.version).toBe(2);
      expect(history.action).toBe("update");
      expect(history.changes).toContain("competency");
    });

    it("should support all action types", () => {
      const actions: Array<"create" | "update" | "delete" | "publish"> = [
        "create",
        "update",
        "delete",
        "publish",
      ];

      actions.forEach((action) => {
        const historyEntry: ContentHistory = {
          id: `history-${action}`,
          content_id: "content-1",
          version: 1,
          timestamp: new Date(),
          user: "user@example.com",
          action,
          changes: `Action: ${action}`,
          content_snapshot: {},
        };

        expect(historyEntry.action).toBe(action);
      });
    });
  });

  describe("ContentFilter interface", () => {
    it("should create filter with all optional fields", () => {
      const filter: ContentFilter = {
        type: "domain",
        status: "published",
        search: "AI literacy",
        language: "en",
      };

      expect(filter.type).toBe("domain");
      expect(filter.status).toBe("published");
      expect(filter.search).toBe("AI literacy");
      expect(filter.language).toBe("en");
    });

    it("should allow empty filter", () => {
      const emptyFilter: ContentFilter = {};

      expect(emptyFilter.type).toBeUndefined();
      expect(emptyFilter.status).toBeUndefined();
      expect(emptyFilter.search).toBeUndefined();
      expect(emptyFilter.language).toBeUndefined();
    });

    it("should allow partial filters", () => {
      const typeFilter: ContentFilter = { type: "question" };
      const statusFilter: ContentFilter = { status: "draft" };
      const searchFilter: ContentFilter = { search: "ethics" };

      expect(typeFilter.type).toBe("question");
      expect(statusFilter.status).toBe("draft");
      expect(searchFilter.search).toBe("ethics");
    });
  });

  describe("ContentService interface", () => {
    it("should define all required service methods", () => {
      const mockService: ContentService = {
        list: jest.fn().mockResolvedValue([]),
        get: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({} as ContentItem),
        update: jest.fn().mockResolvedValue({} as ContentItem),
        delete: jest.fn().mockResolvedValue(undefined),
        getHistory: jest.fn().mockResolvedValue([]),
        publish: jest.fn().mockResolvedValue(undefined),
        createPullRequest: jest
          .fn()
          .mockResolvedValue({ url: "https://github.com/pr/1" }),
      };

      expect(typeof mockService.list).toBe("function");
      expect(typeof mockService.get).toBe("function");
      expect(typeof mockService.create).toBe("function");
      expect(typeof mockService.update).toBe("function");
      expect(typeof mockService.delete).toBe("function");
      expect(typeof mockService.getHistory).toBe("function");
      expect(typeof mockService.publish).toBe("function");
      expect(typeof mockService.createPullRequest).toBe("function");
    });

    it("should handle async operations correctly", async () => {
      const testItem: ContentItem = {
        id: "test-1",
        type: "ksa",
        status: "draft",
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: "test",
        updated_by: "test",
        title: "KSA Mapping",
        content: {},
        file_path: "/ksa/mapping.yaml",
      };

      const mockService: ContentService = {
        list: jest.fn().mockResolvedValue([testItem]),
        get: jest.fn().mockResolvedValue(testItem),
        create: jest.fn().mockResolvedValue(testItem),
        update: jest.fn().mockResolvedValue(testItem),
        delete: jest.fn().mockResolvedValue(undefined),
        getHistory: jest.fn().mockResolvedValue([]),
        publish: jest.fn().mockResolvedValue(undefined),
        createPullRequest: jest
          .fn()
          .mockResolvedValue({ url: "https://github.com/pr/1" }),
      };

      const items = await mockService.list();
      expect(items).toHaveLength(1);

      const item = await mockService.get("test-1");
      expect(item?.id).toBe("test-1");

      const pr = await mockService.createPullRequest(
        "test-1",
        "Update content",
      );
      expect(pr.url).toContain("github.com");
    });
  });

  describe("AdminUser interface", () => {
    it("should define admin user with all roles", () => {
      const adminUser: AdminUser = {
        id: "user-admin",
        email: "admin@example.com",
        role: "admin",
        permissions: ["read", "write", "delete", "publish"],
      };

      const editorUser: AdminUser = {
        id: "user-editor",
        email: "editor@example.com",
        role: "editor",
        permissions: ["read", "write"],
      };

      const viewerUser: AdminUser = {
        id: "user-viewer",
        email: "viewer@example.com",
        role: "viewer",
        permissions: ["read"],
      };

      expect(adminUser.role).toBe("admin");
      expect(editorUser.role).toBe("editor");
      expect(viewerUser.role).toBe("viewer");
      expect(adminUser.permissions).toContain("publish");
      expect(viewerUser.permissions).not.toContain("write");
    });

    it("should allow empty permissions array", () => {
      const restrictedUser: AdminUser = {
        id: "user-restricted",
        email: "restricted@example.com",
        role: "viewer",
        permissions: [],
      };

      expect(restrictedUser.permissions).toHaveLength(0);
    });
  });

  describe("CMSConfig interface", () => {
    it("should define CMS configuration with all fields", () => {
      const fullConfig: CMSConfig = {
        githubToken: "ghp_secrettoken123",
        autoCreatePR: true,
        requireApproval: true,
        allowedEditors: ["editor1@example.com", "editor2@example.com"],
      };

      expect(fullConfig.githubToken).toBe("ghp_secrettoken123");
      expect(fullConfig.autoCreatePR).toBe(true);
      expect(fullConfig.requireApproval).toBe(true);
      expect(fullConfig.allowedEditors).toHaveLength(2);
    });

    it("should allow config without optional github token", () => {
      const configWithoutToken: CMSConfig = {
        autoCreatePR: false,
        requireApproval: false,
        allowedEditors: [],
      };

      expect(configWithoutToken.githubToken).toBeUndefined();
      expect(configWithoutToken.autoCreatePR).toBe(false);
    });

    it("should handle different editor list configurations", () => {
      const noEditorsConfig: CMSConfig = {
        autoCreatePR: true,
        requireApproval: true,
        allowedEditors: [],
      };

      const manyEditorsConfig: CMSConfig = {
        autoCreatePR: false,
        requireApproval: true,
        allowedEditors: [
          "editor1@example.com",
          "editor2@example.com",
          "editor3@example.com",
          "admin@example.com",
        ],
      };

      expect(noEditorsConfig.allowedEditors).toHaveLength(0);
      expect(manyEditorsConfig.allowedEditors).toHaveLength(4);
      expect(manyEditorsConfig.allowedEditors).toContain("admin@example.com");
    });
  });

  describe("Type exports validation", () => {
    it("should export all CMS types correctly", () => {
      // Type assertion tests to ensure all types are properly exported
      const contentType = "domain" as ContentType;
      const contentStatus = "draft" as ContentStatus;
      const contentItem = {} as ContentItem;
      const contentHistory = {} as ContentHistory;
      const contentFilter = {} as ContentFilter;
      const contentService = {} as ContentService;
      const adminUser = {} as AdminUser;
      const cmsConfig = {} as CMSConfig;

      expect(contentType).toBeDefined();
      expect(contentStatus).toBeDefined();
      expect(contentItem).toBeDefined();
      expect(contentHistory).toBeDefined();
      expect(contentFilter).toBeDefined();
      expect(contentService).toBeDefined();
      expect(adminUser).toBeDefined();
      expect(cmsConfig).toBeDefined();
    });
  });

  describe("Edge cases and type safety", () => {
    it("should handle date serialization in content items", () => {
      const item: ContentItem = {
        id: "date-test",
        type: "question",
        status: "draft",
        version: 1,
        created_at: new Date("2024-01-01T00:00:00Z"),
        updated_at: new Date("2024-01-02T12:30:45Z"),
        created_by: "system",
        updated_by: "system",
        title: "Date Test",
        content: {},
        file_path: "/test.yaml",
      };

      expect(item.created_at.getFullYear()).toBe(2024);
      expect(item.updated_at.getMonth()).toBe(0); // January is 0
    });

    it("should handle complex content structures", () => {
      const complexContent: ContentItem = {
        id: "complex-1",
        type: "domain",
        status: "published",
        version: 5,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: "admin",
        updated_by: "admin",
        title: "Complex Domain",
        content: {
          nested: {
            deep: {
              structure: {
                with: ["arrays", "and", "objects"],
                numbers: [1, 2, 3],
                boolean: true,
                null: null,
              },
            },
          },
        },
        file_path: "/complex.yaml",
      };

      expect(complexContent.content).toBeDefined();
      expect(typeof complexContent.content).toBe("object");
    });
  });
});
