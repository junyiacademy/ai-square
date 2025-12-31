import { NextRequest } from "next/server";
import { POST } from "../route";

// Mocks
const mockQuery = jest.fn();

jest.mock("@/lib/db/get-pool", () => ({
  getPool: () => ({
    query: (...args: unknown[]) => mockQuery(...args),
  }),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(async (pwd: string) => `hashed:${pwd}`),
}));

describe("/api/admin/fix-demo-accounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 for invalid secret", async () => {
    const request = new NextRequest(
      "http://localhost:3001/api/admin/fix-demo-accounts",
      {
        method: "POST",
        body: JSON.stringify({ secretKey: "wrong" }),
      },
    );

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(401);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
  });

  it("should create or update demo accounts and return verification", async () => {
    // Simple in-memory stub behavior
    type User = {
      id: string;
      email: string;
      role: string;
      password_hash?: string;
      email_verified?: boolean;
    };
    const users = new Map<string, User>();

    mockQuery.mockImplementation(async (sql: string, params?: unknown[]) => {
      const text = sql.replace(/\s+/g, " ").trim().toUpperCase();
      if (
        text.startsWith(
          "SELECT ID, EMAIL, PASSWORD_HASH, ROLE FROM USERS WHERE EMAIL =",
        )
      ) {
        const email = params?.[0] as string;
        const u = users.get(email);
        return {
          rows: u
            ? [
                {
                  id: u.id,
                  email: u.email,
                  password_hash: u.password_hash,
                  role: u.role,
                },
              ]
            : [],
        };
      }
      if (text.startsWith("INSERT INTO USERS")) {
        const email = params?.[0] as string;
        const password_hash = params?.[1] as string;
        const role = params?.[2] as string;
        users.set(email, {
          id: `id-${role}`,
          email,
          role,
          password_hash,
          email_verified: true,
        });
        return { rows: [{ id: `id-${role}`, email, role }] };
      }
      if (text.startsWith("UPDATE USERS")) {
        const password_hash = params?.[0] as string;
        const role = params?.[1] as string;
        const email = params?.[2] as string;
        const existing = users.get(email) || { id: `id-${role}`, email, role };
        users.set(email, {
          ...existing,
          role,
          password_hash,
          email_verified: true,
        });
        return { rowCount: 1 };
      }
      if (text.startsWith("SELECT EMAIL, ROLE")) {
        // final verification select
        const rows = [
          "student@example.com",
          "teacher@example.com",
          "admin@example.com",
        ].map((email) => {
          const u =
            users.get(email) ||
            ({ email, role: email.split("@")[0].split(".")[0] } as User);
          return {
            email: u.email,
            role: u.role,
            password_status: u.password_hash ? "SET" : "NOT SET",
            email_verified: u.email_verified ?? true,
          };
        });
        return { rows };
      }
      return { rows: [] };
    });

    const request = new NextRequest(
      "http://localhost:3001/api/admin/fix-demo-accounts",
      {
        method: "POST",
        body: JSON.stringify({ secretKey: "fix-demo-accounts-2025" }),
      },
    );

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/Demo accounts fixed/i);
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results.length).toBe(3);
    // Each result should include email, action, role
    for (const r of result.results) {
      expect(r).toHaveProperty("email");
      expect(r).toHaveProperty("action");
      expect(r).toHaveProperty("role");
    }
    // Verification should contain 3 entries
    expect(Array.isArray(result.verification)).toBe(true);
    expect(result.verification.length).toBe(3);
    expect(result.credentials).toBeDefined();
    expect(result.credentials.student).toMatch(/student@example.com/);
  });

  it("should return 500 on unexpected errors", async () => {
    mockQuery.mockImplementationOnce(() => {
      throw new Error("boom");
    });

    const request = new NextRequest(
      "http://localhost:3001/api/admin/fix-demo-accounts",
      {
        method: "POST",
        body: JSON.stringify({ secretKey: "fix-demo-accounts-2025" }),
      },
    );

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(500);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to fix demo accounts");
  });
});
