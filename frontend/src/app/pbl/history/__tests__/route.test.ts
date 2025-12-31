import { GET } from "../route";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

describe("GET /app/pbl/history (redirect)", () => {
  it("should call redirect to /history", async () => {
    const { redirect } = require("next/navigation") as { redirect: jest.Mock };
    await GET();
    expect(redirect).toHaveBeenCalledWith("/history");
  });
});
