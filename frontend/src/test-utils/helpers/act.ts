/**
 * React Act Warning Helpers
 * 協助處理 React 18+ 的 act() 警告
 */

import { act } from "@testing-library/react";

/**
 * Wrapper for async operations that might cause act() warnings
 * @param callback Async function to run inside act()
 */
export async function actAsync<T>(callback: () => Promise<T>): Promise<T> {
  let result: T;
  await act(async () => {
    result = await callback();
  });
  return result!;
}

/**
 * Wait for all pending promises and timers
 * Useful for ensuring all async operations complete
 */
export async function waitForAllSettled() {
  // Wait for promises
  await act(async () => {
    await Promise.resolve();
  });

  // Run all timers if using fake timers
  if (typeof jest !== "undefined" && jest.isMockFunction(setTimeout)) {
    act(() => {
      jest.runAllTimers();
    });
  }
}

/**
 * Wrapper for userEvent operations to prevent act() warnings
 * @param userEventOperation The userEvent operation to perform
 */
export async function userEventAct(userEventOperation: () => Promise<void>) {
  await act(async () => {
    await userEventOperation();
  });
}

/**
 * Wait for a condition to be true
 * @param condition Function that returns true when condition is met
 * @param timeout Maximum time to wait in milliseconds
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 5000,
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error("Timeout waiting for condition");
    }

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  }
}

/**
 * Suppress act() warnings for a specific test
 * Use sparingly - it's better to fix the warnings
 */
export function suppressActWarnings() {
  const originalError = console.error;

  beforeEach(() => {
    console.error = (...args: any[]) => {
      if (args[0]?.includes?.("act()")) {
        return;
      }
      originalError.call(console, ...args);
    };
  });

  afterEach(() => {
    console.error = originalError;
  });
}
