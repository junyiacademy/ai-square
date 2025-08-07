import { NextRequest } from "next/server";
import { GET } from "../route";

describe("/api/assessment/results/[id]", () => {
  it("returns 400 when userId is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/assessment/results/eval123");
    const response = await GET(request, { params: Promise.resolve({'id':'test-id'}) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("userId is required");
  });
});
