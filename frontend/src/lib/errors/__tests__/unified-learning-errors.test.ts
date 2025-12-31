/**
 * 統一學習錯誤處理測試
 */

import {
  UnifiedLearningError,
  ResourceNotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  InvalidStateError,
  EvaluationError,
  StorageError,
  AIServiceError,
  QuotaExceededError,
  ErrorHandler,
} from "../unified-learning-errors";

describe("UnifiedLearningError", () => {
  describe("ResourceNotFoundError", () => {
    it("should create error with correct properties", () => {
      const error = new ResourceNotFoundError("Scenario", "scenario-123");

      expect(error.message).toBe("Scenario not found: scenario-123");
      expect(error.code).toBe("RESOURCE_NOT_FOUND");
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual({
        resourceType: "Scenario",
        resourceId: "scenario-123",
      });
    });

    it("should serialize to JSON correctly", () => {
      const error = new ResourceNotFoundError("Task", "task-456");
      const json = error.toJSON();

      expect(json).toEqual({
        name: "ResourceNotFoundError",
        message: "Task not found: task-456",
        code: "RESOURCE_NOT_FOUND",
        statusCode: 404,
        details: {
          resourceType: "Task",
          resourceId: "task-456",
        },
      });
    });
  });

  describe("ValidationError", () => {
    it("should create error with field and value", () => {
      const error = new ValidationError(
        "Invalid email format",
        "email",
        "not-an-email",
      );

      expect(error.message).toBe("Invalid email format");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({
        field: "email",
        value: "not-an-email",
      });
    });

    it("should create error without field and value", () => {
      const error = new ValidationError("Invalid input");

      expect(error.message).toBe("Invalid input");
      expect(error.details).toEqual({
        field: undefined,
        value: undefined,
      });
    });
  });

  describe("InvalidStateError", () => {
    it("should create error with state details", () => {
      const error = new InvalidStateError(
        "Cannot complete task in pending state",
        "pending",
        "active",
      );

      expect(error.message).toBe("Cannot complete task in pending state");
      expect(error.code).toBe("INVALID_STATE");
      expect(error.statusCode).toBe(409);
      expect(error.details).toEqual({
        currentState: "pending",
        expectedState: "active",
      });
    });
  });

  describe("QuotaExceededError", () => {
    it("should create error with quota details", () => {
      const error = new QuotaExceededError("API calls", 1000, 1001);

      expect(error.message).toBe(
        "Quota exceeded for API calls. Limit: 1000, Current: 1001",
      );
      expect(error.code).toBe("QUOTA_EXCEEDED");
      expect(error.statusCode).toBe(429);
      expect(error.details).toEqual({
        resource: "API calls",
        limit: 1000,
        current: 1001,
      });
    });
  });
});

describe("ErrorHandler", () => {
  describe("handle", () => {
    it("should handle UnifiedLearningError", () => {
      const error = new ResourceNotFoundError("Program", "prog-123");
      const result = ErrorHandler.handle(error);

      expect(result).toEqual({
        error: {
          name: "ResourceNotFoundError",
          message: "Program not found: prog-123",
          code: "RESOURCE_NOT_FOUND",
          statusCode: 404,
          details: {
            resourceType: "Program",
            resourceId: "prog-123",
          },
        },
      });
    });

    it("should handle native Error", () => {
      const error = new Error("Something went wrong");
      const result = ErrorHandler.handle(error);

      expect(result.error.message).toBe("Something went wrong");
      expect(result.error.code).toBe("INTERNAL_ERROR");
      expect(result.error.statusCode).toBe(500);
      expect(result.error.details?.name).toBe("Error");
    });

    it("should handle unknown error", () => {
      const error = "string error";
      const result = ErrorHandler.handle(error);

      expect(result.error.message).toBe("An unknown error occurred");
      expect(result.error.code).toBe("UNKNOWN_ERROR");
      expect(result.error.statusCode).toBe(500);
      expect(result.error.details?.error).toBe("string error");
    });
  });

  describe("isErrorType", () => {
    it("should correctly identify error types", () => {
      const notFoundError = new ResourceNotFoundError("Evaluation", "eval-123");
      const validationError = new ValidationError("Invalid");

      expect(
        ErrorHandler.isErrorType(notFoundError, ResourceNotFoundError as any),
      ).toBe(true);
      expect(
        ErrorHandler.isErrorType(notFoundError, ValidationError as any),
      ).toBe(false);
      expect(
        ErrorHandler.isErrorType(validationError, ValidationError as any),
      ).toBe(true);
      expect(
        ErrorHandler.isErrorType(validationError, ResourceNotFoundError as any),
      ).toBe(false);
    });
  });

  describe("retry", () => {
    it("should retry on retriable errors", async () => {
      let attempts = 0;
      const fn = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new StorageError("Temporary failure", "write");
        }
        return "success";
      });

      const result = await ErrorHandler.retry(fn, {
        maxRetries: 3,
        delay: 10,
      });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should not retry on non-retriable errors", async () => {
      const fn = jest.fn(async () => {
        throw new ValidationError("Invalid input");
      });

      await expect(
        ErrorHandler.retry(fn, {
          maxRetries: 3,
          delay: 10,
        }),
      ).rejects.toThrow(ValidationError);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should fail after max retries", async () => {
      const fn = jest.fn(async () => {
        throw new StorageError("Persistent failure", "write");
      });

      await expect(
        ErrorHandler.retry(fn, {
          maxRetries: 2,
          delay: 10,
        }),
      ).rejects.toThrow(StorageError);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should use custom shouldRetry function", async () => {
      let attempts = 0;
      const fn = jest.fn(async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error("First attempt");
        }
        return "success";
      });

      const result = await ErrorHandler.retry(fn, {
        maxRetries: 3,
        delay: 10,
        shouldRetry: (error, attempt) => attempt === 0,
      });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("apiErrorHandler", () => {
    it("should return proper error response", async () => {
      const error = new ResourceNotFoundError("User", "user-123");
      const request = new Request("http://localhost/api/test");

      const response = await ErrorHandler.apiErrorHandler(error, request);
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json).toEqual({
        error: {
          name: "ResourceNotFoundError",
          message: "User not found: user-123",
          code: "RESOURCE_NOT_FOUND",
          statusCode: 404,
          details: {
            resourceType: "User",
            resourceId: "user-123",
          },
        },
      });
    });
  });
});

describe("Error instances", () => {
  it("should be instanceof Error", () => {
    const errors = [
      new ResourceNotFoundError("Test", "123"),
      new ValidationError("Test"),
      new UnauthorizedError(),
      new ForbiddenError("resource", "read"),
      new InvalidStateError("Test", "current", "expected"),
      new EvaluationError("Test"),
      new StorageError("Test", "read"),
      new AIServiceError("Test", "gpt"),
      new QuotaExceededError("Test", 100, 101),
    ];

    errors.forEach((error) => {
      expect(error instanceof Error).toBe(true);
      expect(error instanceof UnifiedLearningError).toBe(true);
    });
  });
});
