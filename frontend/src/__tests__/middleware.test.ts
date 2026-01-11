import { NextRequest, NextResponse } from "next/server";
import { middleware, config } from "../middleware";

// Unmock AuthManager to test the actual middleware functionality
jest.unmock("@/lib/auth/auth-manager");

// Mock NextResponse methods with proper headers support
jest.mock("next/server", () => ({
  NextRequest: jest.requireActual("next/server").NextRequest,
  NextResponse: {
    next: jest.fn(() => ({
      type: "next",
      headers: {
        set: jest.fn(),
        get: jest.fn(),
        has: jest.fn(),
        delete: jest.fn(),
      },
    })),
    redirect: jest.fn((url: URL) => ({
      type: "redirect",
      url: url.toString(),
    })),
    json: jest.fn((data: unknown, init?: ResponseInit) => ({
      type: "json",
      data,
      status: init?.status || 200,
      headers: {
        set: jest.fn(),
        get: jest.fn(),
        has: jest.fn(),
        delete: jest.fn(),
      },
    })),
  },
}));

describe("middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("unprotected routes", () => {
    it("should allow access to home page", () => {
      const request = new NextRequest("http://localhost:3000/");
      const response = middleware(request);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toMatchObject({ type: "next" });
    });

    it("should allow access to login page", () => {
      const request = new NextRequest("http://localhost:3000/login");
      const response = middleware(request);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toMatchObject({ type: "next" });
    });

    it("should allow access to register page", () => {
      const request = new NextRequest("http://localhost:3000/register");
      const response = middleware(request);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toMatchObject({ type: "next" });
    });
  });

  describe("protected routes", () => {
    describe("without authentication", () => {
      it("should redirect /pbl to login", () => {
        const request = new NextRequest("http://localhost:3000/pbl");
        const response = middleware(request);

        expect(NextResponse.redirect).toHaveBeenCalled();
        expect(response).toEqual({
          type: "redirect",
          url: expect.stringContaining("/login"),
        });
      });

      it("should redirect /assessment to login", () => {
        const request = new NextRequest("http://localhost:3000/assessment");
        const response = middleware(request);

        expect(NextResponse.redirect).toHaveBeenCalled();
        expect(response).toEqual({
          type: "redirect",
          url: expect.stringContaining("/login"),
        });
      });

      it("should redirect /discovery to login", () => {
        const request = new NextRequest("http://localhost:3000/discovery");
        const response = middleware(request);

        expect(NextResponse.redirect).toHaveBeenCalled();
        expect(response).toEqual({
          type: "redirect",
          url: expect.stringContaining("/login"),
        });
      });

      it("should allow /admin without authentication (special case)", () => {
        const request = new NextRequest("http://localhost:3000/admin");
        const response = middleware(request);

        // /admin is explicitly allowed without auth (for development/testing)
        expect(NextResponse.redirect).not.toHaveBeenCalled();
        expect(response).toMatchObject({
          type: "next",
        });
      });

      it("should redirect /profile to login", () => {
        const request = new NextRequest("http://localhost:3000/profile");
        const response = middleware(request);

        expect(NextResponse.redirect).toHaveBeenCalled();
        expect(response).toEqual({
          type: "redirect",
          url: expect.stringContaining("/login"),
        });
      });

      it("should preserve redirect parameter", () => {
        const request = new NextRequest(
          "http://localhost:3000/pbl/scenarios/123",
        );
        const response = middleware(request);

        expect(NextResponse.redirect).toHaveBeenCalled();
        const redirectCall = (NextResponse.redirect as jest.Mock).mock
          .calls[0][0];
        expect(redirectCall.toString()).toContain(
          "redirect=%2Fpbl%2Fscenarios%2F123",
        );
      });
    });

    describe("with authentication", () => {
      it("should allow access with valid sessionToken", () => {
        const request = new NextRequest("http://localhost:3000/pbl");
        // Create a valid hex session token (32 bytes = 64 hex chars)
        const validToken = "a".repeat(64); // Simple valid hex token for testing
        request.cookies.set("sessionToken", validToken);

        const response = middleware(request);

        expect(NextResponse.next).toHaveBeenCalled();
        expect(response).toMatchObject({ type: "next" });
      });

      it("should redirect if sessionToken is missing", () => {
        const request = new NextRequest("http://localhost:3000/pbl");

        const response = middleware(request);

        expect(NextResponse.redirect).toHaveBeenCalled();
      });

      it("should redirect if sessionToken is invalid", () => {
        const request = new NextRequest("http://localhost:3000/pbl");
        request.cookies.set("sessionToken", "invalid-token");

        const response = middleware(request);

        expect(NextResponse.redirect).toHaveBeenCalled();
      });

      it("should redirect if sessionToken is empty", () => {
        const request = new NextRequest("http://localhost:3000/pbl");
        request.cookies.set("sessionToken", "");

        const response = middleware(request);

        expect(NextResponse.redirect).toHaveBeenCalled();
      });
    });
  });

  describe("skipped routes", () => {
    it("should skip API routes", () => {
      const request = new NextRequest("http://localhost:3000/api/auth/login");
      const response = middleware(request);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toMatchObject({ type: "next" });
    });

    it("should skip static files", () => {
      const request = new NextRequest("http://localhost:3000/image.png");
      const response = middleware(request);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toMatchObject({ type: "next" });
    });

    it("should skip _next internal routes", () => {
      const request = new NextRequest(
        "http://localhost:3000/_next/static/chunk.js",
      );
      const response = middleware(request);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toMatchObject({ type: "next" });
    });
  });
});

describe("middleware config", () => {
  it("should have correct matcher configuration", () => {
    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
    expect(config.matcher).toContain(
      "/((?!_next/static|_next/image|favicon.ico|public).*)",
    );
  });
});
