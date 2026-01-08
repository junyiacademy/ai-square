import { renderHook, waitFor } from "@testing-library/react";
import { useCurrentUser } from "../useCurrentUser";

describe("useCurrentUser", () => {
  const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: mockLocalStorage,
      writable: true,
    });
    mockLocalStorage.clear();
  });

  it("returns null when user is not logged in", () => {
    const { result } = renderHook(() => useCurrentUser());
    expect(result.current).toBeNull();
  });

  it("returns user data when user is logged in", () => {
    mockLocalStorage.setItem("isLoggedIn", "true");
    mockLocalStorage.setItem(
      "user",
      JSON.stringify({ id: 123, email: "test@example.com" }),
    );

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current).toEqual({
      id: "123",
      email: "test@example.com",
    });
  });

  it("returns null when isLoggedIn is false", () => {
    mockLocalStorage.setItem("isLoggedIn", "false");
    mockLocalStorage.setItem(
      "user",
      JSON.stringify({ id: 123, email: "test@example.com" }),
    );

    const { result } = renderHook(() => useCurrentUser());
    expect(result.current).toBeNull();
  });
});
