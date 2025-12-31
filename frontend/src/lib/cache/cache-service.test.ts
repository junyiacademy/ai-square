import { cacheService } from "./cache-service";

// Mock localStorage for browser environment
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("CacheService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe("get and set", () => {
    it("should store and retrieve values from memory cache", async () => {
      await cacheService.set("testKey", "testValue", { storage: "memory" });
      const result = await cacheService.get("testKey", "memory");
      expect(result).toBe("testValue");
    });

    it("should return null for non-existent keys", async () => {
      const result = await cacheService.get("nonExistentKey");
      expect(result).toBeNull();
    });
  });

  describe("fetchWithCache", () => {
    beforeEach(() => {
      // Reset fetch mock
      (global.fetch as jest.Mock).mockReset();
    });

    it("should fetch and cache data", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: "test" }),
      });

      const result = await cacheService.fetchWithCache("http://test.com/api");
      expect(result).toEqual({ data: "test" });
      expect(global.fetch).toHaveBeenCalledWith("http://test.com/api", {});
    });

    it("should use cached data on second call", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: "test" }),
      });

      // First call
      await cacheService.fetchWithCache("http://test.com/api");

      // Reset mock to verify it's not called again
      (global.fetch as jest.Mock).mockReset();

      // Second call should use cache
      const result = await cacheService.fetchWithCache("http://test.com/api");
      expect(result).toEqual({ data: "test" });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should throw on fetch error", async () => {
      // Clear any existing cache for this URL first
      await cacheService.clear();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ error: "Server error" }),
      });

      await expect(
        cacheService.fetchWithCache("http://test.com/api/error"),
      ).rejects.toThrow("HTTP error! status: 500");
    });
  });
});
