import type {
  ApiResponse,
  ErrorResponse,
  PaginationParams,
  TimestampedEntity,
  TypedRequest,
} from "../api";

describe("API Types", () => {
  describe("ApiResponse", () => {
    it("should allow successful response with data", () => {
      const response: ApiResponse<{ name: string }> = {
        success: true,
        data: { name: "test" },
      };
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ name: "test" });
    });

    it("should allow error response", () => {
      const response: ApiResponse = {
        success: false,
        error: "Error occurred",
        message: "Detailed error message",
      };
      expect(response.success).toBe(false);
      expect(response.error).toBe("Error occurred");
      expect(response.message).toBe("Detailed error message");
    });

    it("should allow response without data", () => {
      const response: ApiResponse = {
        success: true,
      };
      expect(response.success).toBe(true);
      expect(response.data).toBeUndefined();
    });
  });

  describe("ErrorResponse", () => {
    it("should have required error field", () => {
      const error: ErrorResponse = {
        error: "Something went wrong",
      };
      expect(error.error).toBe("Something went wrong");
    });

    it("should allow optional details and statusCode", () => {
      const error: ErrorResponse = {
        error: "Validation failed",
        details: "Field X is required",
        statusCode: 400,
      };
      expect(error.details).toBe("Field X is required");
      expect(error.statusCode).toBe(400);
    });
  });

  describe("PaginationParams", () => {
    it("should allow all pagination parameters", () => {
      const params: PaginationParams = {
        page: 2,
        limit: 20,
        offset: 20,
      };
      expect(params.page).toBe(2);
      expect(params.limit).toBe(20);
      expect(params.offset).toBe(20);
    });

    it("should allow partial pagination parameters", () => {
      const params: PaginationParams = {
        page: 1,
      };
      expect(params.page).toBe(1);
      expect(params.limit).toBeUndefined();
      expect(params.offset).toBeUndefined();
    });

    it("should allow empty pagination parameters", () => {
      const params: PaginationParams = {};
      expect(params.page).toBeUndefined();
      expect(params.limit).toBeUndefined();
      expect(params.offset).toBeUndefined();
    });
  });

  describe("TimestampedEntity", () => {
    it("should have createdAt and updatedAt", () => {
      const entity: TimestampedEntity = {
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      };
      expect(entity.createdAt).toBe("2024-01-01T00:00:00Z");
      expect(entity.updatedAt).toBe("2024-01-02T00:00:00Z");
    });
  });

  describe("TypedRequest", () => {
    it("should extend Request with typed json method", async () => {
      const mockJson = jest.fn().mockResolvedValue({ id: 1, name: "test" });
      const request = {
        json: mockJson,
        url: "http://test.com",
        method: "POST",
      } as unknown as TypedRequest<{ id: number; name: string }>;

      const data = await request.json();
      expect(data).toEqual({ id: 1, name: "test" });
      expect(mockJson).toHaveBeenCalled();
    });
  });
});
