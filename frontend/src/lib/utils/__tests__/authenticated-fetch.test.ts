import { authenticatedFetch } from "../authenticated-fetch";

// Mock global fetch
global.fetch = jest.fn();

describe("authenticatedFetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should always include credentials: include", async () => {
    const mockResponse = new Response(JSON.stringify({ success: true }));
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await authenticatedFetch("/api/test");

    expect(global.fetch).toHaveBeenCalledWith("/api/test", {
      credentials: "include",
    });
  });

  it("should merge with existing options", async () => {
    const mockResponse = new Response(JSON.stringify({ success: true }));
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await authenticatedFetch("/api/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: "test" }),
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/test", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: "test" }),
    });
  });

  it("should not override credentials if explicitly set to something else", async () => {
    const mockResponse = new Response(JSON.stringify({ success: true }));
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await authenticatedFetch("/api/test", {
      credentials: "same-origin", // This should be overridden
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/test", {
      credentials: "include", // Should always be include
    });
  });

  it("should handle URL objects", async () => {
    const mockResponse = new Response(JSON.stringify({ success: true }));
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const url = new URL("/api/test", "http://localhost:3000");
    await authenticatedFetch(url);

    expect(global.fetch).toHaveBeenCalledWith(url, {
      credentials: "include",
    });
  });

  it("should handle Request objects", async () => {
    const mockResponse = new Response(JSON.stringify({ success: true }));
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const request = new Request("/api/test", {
      method: "POST",
      headers: {
        "X-Custom": "header",
      },
    });

    await authenticatedFetch(request);

    expect(global.fetch).toHaveBeenCalledWith(request, {
      credentials: "include",
    });
  });

  it("should return the same response as fetch", async () => {
    const expectedData = { result: "success" };
    const mockResponse = new Response(JSON.stringify(expectedData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const response = await authenticatedFetch("/api/test");
    const data = await response.json();

    expect(data).toEqual(expectedData);
    expect(response.status).toBe(200);
  });

  it("should handle errors properly", async () => {
    const error = new Error("Network error");
    (global.fetch as jest.Mock).mockRejectedValue(error);

    await expect(authenticatedFetch("/api/test")).rejects.toThrow(
      "Network error",
    );
  });
});
