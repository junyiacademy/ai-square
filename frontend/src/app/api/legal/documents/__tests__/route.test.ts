/**
 * Legal Documents API Route Tests
 * 測試法律文件 API
 */

import { NextRequest } from "next/server";
import { GET } from "../route";
import { getPool } from "@/lib/db/get-pool";
import { mockConsoleError as createMockConsoleError } from "@/test-utils/helpers/console";

// Mock dependencies
jest.mock("@/lib/db/get-pool");

// Mock console methods
const mockConsoleError = createMockConsoleError();
const mockGetPool = getPool as jest.MockedFunction<typeof getPool>;

describe("/api/legal/documents", () => {
  let mockPool: {
    query: jest.MockedFunction<any>;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPool = {
      query: jest.fn(),
    };

    mockGetPool.mockReturnValue(mockPool as any);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  const mockDocuments = [
    {
      id: "doc-1",
      type: "privacy_policy",
      version: "1.0",
      title: {
        en: "Privacy Policy",
        zh: "隱私政策",
        es: "Política de Privacidad",
      },
      content: {
        en: "This is our privacy policy...",
        zh: "這是我們的隱私政策...",
        es: "Esta es nuestra política de privacidad...",
      },
      summary_of_changes: {
        en: "Initial version",
        zh: "初始版本",
        es: "Versión inicial",
      },
      effective_date: "2025-01-01T00:00:00Z",
      created_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "doc-2",
      type: "terms_of_service",
      version: "2.1",
      title: {
        en: "Terms of Service",
        zh: "服務條款",
      },
      content: {
        en: "These are our terms of service...",
        zh: "這些是我們的服務條款...",
      },
      summary_of_changes: null,
      effective_date: "2025-02-01T00:00:00Z",
      created_at: "2025-02-01T00:00:00Z",
    },
  ];

  describe("GET - Retrieve Legal Documents", () => {
    describe("Query Parameters", () => {
      it("should return all documents when no parameters provided", async () => {
        mockPool.query.mockResolvedValue({ rows: mockDocuments });

        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents",
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.documents).toHaveLength(2);

        // Should use latest version query
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining("DISTINCT ON (type)"),
          [],
        );
      });

      it("should filter by document type", async () => {
        const filteredDocs = [mockDocuments[0]];
        mockPool.query.mockResolvedValue({ rows: filteredDocs });

        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents?type=privacy_policy",
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.documents).toHaveLength(1);
        expect(data.documents[0].type).toBe("privacy_policy");

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining("WHERE type = $1"),
          ["privacy_policy"],
        );
      });

      it("should filter by specific version", async () => {
        mockPool.query.mockResolvedValue({ rows: [mockDocuments[0]] });

        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents?type=privacy_policy&version=1.0",
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.documents).toHaveLength(1);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining("AND type = $1"),
          ["privacy_policy", "1.0"],
        );
      });

      it("should handle version parameter without type", async () => {
        mockPool.query.mockResolvedValue({ rows: mockDocuments });

        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents?version=1.0",
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining("AND version = $1"),
          ["1.0"],
        );
      });
    });

    describe("Language Support", () => {
      beforeEach(() => {
        mockPool.query.mockResolvedValue({ rows: mockDocuments });
      });

      it("should return English content by default", async () => {
        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents",
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.documents[0].title).toBe("Privacy Policy");
        expect(data.documents[0].content).toBe("This is our privacy policy...");
        expect(data.documents[0].summaryOfChanges).toBe("Initial version");
      });

      it("should return Chinese content when language=zh", async () => {
        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents?language=zh",
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.documents[0].title).toBe("隱私政策");
        expect(data.documents[0].content).toBe("這是我們的隱私政策...");
        expect(data.documents[0].summaryOfChanges).toBe("初始版本");
      });

      it("should return Spanish content when language=es", async () => {
        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents?language=es",
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.documents[0].title).toBe("Política de Privacidad");
        expect(data.documents[0].content).toBe(
          "Esta es nuestra política de privacidad...",
        );
        expect(data.documents[0].summaryOfChanges).toBe("Versión inicial");
      });

      it("should fallback to English when requested language unavailable", async () => {
        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents?language=fr",
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.documents[1].title).toBe("Terms of Service"); // Only has en, zh
        expect(data.documents[1].content).toBe(
          "These are our terms of service...",
        );
      });

      it("should fallback to first available language when English unavailable", async () => {
        const docWithoutEnglish = {
          ...mockDocuments[0],
          title: { zh: "隱私政策", es: "Política de Privacidad" },
          content: {
            zh: "這是我們的隱私政策...",
            es: "Esta es nuestra política de privacidad...",
          },
          summary_of_changes: { zh: "初始版本", es: "Versión inicial" },
        };

        mockPool.query.mockResolvedValue({ rows: [docWithoutEnglish] });

        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents?language=fr",
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.documents[0].title).toBe("隱私政策"); // First available value
        expect(data.documents[0].content).toBe("這是我們的隱私政策...");
        expect(data.documents[0].summaryOfChanges).toBe("初始版本");
      });

      it("should handle null summary_of_changes", async () => {
        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents",
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.documents[1].summaryOfChanges).toBeNull();
      });
    });

    describe("Response Format", () => {
      beforeEach(() => {
        mockPool.query.mockResolvedValue({ rows: mockDocuments });
      });

      it("should include all required fields in response", async () => {
        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents",
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.documents).toHaveLength(2);

        const doc = data.documents[0];
        expect(doc).toHaveProperty("id");
        expect(doc).toHaveProperty("type");
        expect(doc).toHaveProperty("version");
        expect(doc).toHaveProperty("title");
        expect(doc).toHaveProperty("content");
        expect(doc).toHaveProperty("summaryOfChanges");
        expect(doc).toHaveProperty("effectiveDate");
        expect(doc).toHaveProperty("createdAt");
      });

      it("should transform database field names correctly", async () => {
        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents",
        );
        const response = await GET(request);
        const data = await response.json();

        const doc = data.documents[0];
        expect(doc.summaryOfChanges).toBe("Initial version"); // summary_of_changes -> summaryOfChanges
        expect(doc.effectiveDate).toBe("2025-01-01T00:00:00Z"); // effective_date -> effectiveDate
        expect(doc.createdAt).toBe("2025-01-01T00:00:00Z"); // created_at -> createdAt
      });
    });

    describe("Edge Cases", () => {
      it("should handle empty result set", async () => {
        mockPool.query.mockResolvedValue({ rows: [] });

        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents",
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.documents).toEqual([]);
      });

      it("should handle malformed multilingual fields gracefully", async () => {
        const malformedDoc = {
          ...mockDocuments[0],
          title: "Plain string instead of object",
          content: null,
          summary_of_changes: undefined,
        };

        mockPool.query.mockResolvedValue({ rows: [malformedDoc] });

        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents",
        );
        const response = await GET(request);
        const data = await response.json();

        // Should handle error gracefully and return 500
        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Failed to get legal documents");
      });

      it("should handle special characters in query parameters", async () => {
        mockPool.query.mockResolvedValue({ rows: [] });

        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents?type=test%20type&language=zh-TW",
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.documents).toEqual([]);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining("WHERE type = $1"),
          ["test type"],
        );
      });
    });

    describe("Error Handling", () => {
      it("should handle database connection errors", async () => {
        const dbError = new Error("Database connection failed");
        mockPool.query.mockRejectedValue(dbError);

        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents",
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({
          success: false,
          error: "Failed to get legal documents",
        });

        expect(mockConsoleError).toHaveBeenCalledWith(
          "Get legal documents error:",
          dbError,
        );
      });

      it("should handle SQL query errors", async () => {
        const sqlError = new Error("Invalid SQL syntax");
        mockPool.query.mockRejectedValue(sqlError);

        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents?type=privacy_policy",
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(mockConsoleError).toHaveBeenCalledWith(
          "Get legal documents error:",
          sqlError,
        );
      });
    });

    describe("Query Building Logic", () => {
      it("should use specific version query when version is provided", async () => {
        mockPool.query.mockResolvedValue({ rows: [] });

        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents?version=1.0",
        );
        await GET(request);

        // Should use regular query, not DISTINCT ON
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.not.stringContaining("DISTINCT ON"),
          ["1.0"],
        );
      });

      it("should use latest version query when no version specified", async () => {
        mockPool.query.mockResolvedValue({ rows: [] });

        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents",
        );
        await GET(request);

        // Should use DISTINCT ON query for latest versions
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining("DISTINCT ON (type)"),
          [],
        );
      });

      it("should combine type and version filters correctly", async () => {
        mockPool.query.mockResolvedValue({ rows: [] });

        const request = new NextRequest(
          "http://localhost:3000/api/legal/documents?type=privacy_policy&version=2.0",
        );
        await GET(request);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringMatching(/type = \$1.*version = \$2/),
          ["privacy_policy", "2.0"],
        );
      });
    });
  });
});
