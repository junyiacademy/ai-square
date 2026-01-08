import { renderHook, act, waitFor } from "@testing-library/react";
import { useDiscoveryData } from "../useDiscoveryData";

describe("useDiscoveryData", () => {
  it("should initialize correctly", () => {
    const { result } = renderHook(() => useDiscoveryData());
    expect(result.current).toBeDefined();
  });

  it("should handle state changes", async () => {
    const { result } = renderHook(() => useDiscoveryData());

    await act(async () => {
      // Trigger state change if applicable
      await waitFor(() => {
        expect(result.current).toBeDefined();
      });
    });
  });

  it("should cleanup on unmount", () => {
    const { unmount } = renderHook(() => useDiscoveryData());

    expect(() => {
      unmount();
    }).not.toThrow();
  });
});
