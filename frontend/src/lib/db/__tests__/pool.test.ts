import { query, getPool } from "../pool";
import * as getPoolModule from "../get-pool";

// Mock the get-pool module
jest.mock("../get-pool", () => ({
  getPool: jest.fn(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  })),
}));

describe("Pool Module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("exports", () => {
    it("should export getPool function", () => {
      expect(getPool).toBeDefined();
      expect(typeof getPool).toBe("function");
    });

    it("should export query function", () => {
      expect(query).toBeDefined();
      expect(typeof query).toBe("function");
    });
  });

  describe("query function", () => {
    it("should call pool.query with text and params", async () => {
      const mockResult = { rows: [{ id: 1, name: "test" }], rowCount: 1 };
      const mockPool = {
        query: jest.fn().mockResolvedValue(mockResult),
        connect: jest.fn(),
        end: jest.fn(),
      };

      (getPoolModule.getPool as jest.Mock).mockReturnValue(mockPool);

      const result = await query("SELECT * FROM users WHERE id = $1", [1]);

      expect(getPoolModule.getPool).toHaveBeenCalled();
      expect(mockPool.query).toHaveBeenCalledWith(
        "SELECT * FROM users WHERE id = $1",
        [1],
      );
      expect(result).toEqual(mockResult);
    });

    it("should call pool.query with only text when no params provided", async () => {
      const mockResult = { rows: [], rowCount: 0 };
      const mockPool = {
        query: jest.fn().mockResolvedValue(mockResult),
        connect: jest.fn(),
        end: jest.fn(),
      };

      (getPoolModule.getPool as jest.Mock).mockReturnValue(mockPool);

      const result = await query("SELECT * FROM users");

      expect(getPoolModule.getPool).toHaveBeenCalled();
      expect(mockPool.query).toHaveBeenCalledWith(
        "SELECT * FROM users",
        undefined,
      );
      expect(result).toEqual(mockResult);
    });

    it("should propagate errors from pool.query", async () => {
      const mockError = new Error("Database connection failed");
      const mockPool = {
        query: jest.fn().mockRejectedValue(mockError),
        connect: jest.fn(),
        end: jest.fn(),
      };

      (getPoolModule.getPool as jest.Mock).mockReturnValue(mockPool);

      await expect(query("SELECT * FROM users")).rejects.toThrow(
        "Database connection failed",
      );
      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  describe("getPool function", () => {
    it("should return pool instance", () => {
      const mockPool = {
        query: jest.fn(),
        connect: jest.fn(),
        end: jest.fn(),
      };

      (getPoolModule.getPool as jest.Mock).mockReturnValue(mockPool);

      const pool = getPool();

      expect(pool).toBe(mockPool);
      expect(pool.query).toBeDefined();
      expect(pool.connect).toBeDefined();
      expect(pool.end).toBeDefined();
    });
  });
});
