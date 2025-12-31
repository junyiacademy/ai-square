import { NextRequest } from "next/server";
import { POST } from "../route";

jest.mock("@/lib/email/mailer", () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  appBaseUrl: () => "http://localhost:3000",
}));

const mockQuery = jest.fn();
jest.mock("@/lib/auth/simple-auth", () => {
  const original = jest.requireActual("@/lib/auth/simple-auth");
  return {
    ...original,
    getPool: () => ({ query: mockQuery }),
  };
});

describe("/api/auth/resend-verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns success for unknown email (anti-enum)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const req = new NextRequest(
      "http://localhost/api/auth/resend-verification",
      {
        method: "POST",
        body: JSON.stringify({ email: "unknown@example.com" }),
      } as any,
    );
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("sends email for unverified user and returns success", async () => {
    // SELECT user, not verified
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "u1", name: "X", email_verified: false }],
    });
    // UPDATE token
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const req = new NextRequest(
      "http://localhost/api/auth/resend-verification",
      {
        method: "POST",
        body: JSON.stringify({ email: "u@example.com" }),
      } as any,
    );
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    const { sendEmail } = require("@/lib/email/mailer");
    expect(sendEmail).toHaveBeenCalled();
  });

  it("returns success for already verified user (no email sent)", async () => {
    // SELECT user, verified
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "u1", name: "X", email_verified: true }],
    });

    const req = new NextRequest(
      "http://localhost/api/auth/resend-verification",
      {
        method: "POST",
        body: JSON.stringify({ email: "u@example.com" }),
      } as any,
    );
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    const { sendEmail } = require("@/lib/email/mailer");
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
