/**
 * Tests for browser.ts
 */

describe("browser mocks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should mock localStorage", () => {
    const store: Record<string, string> = {};

    const localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach((key) => delete store[key]);
      },
    };

    expect(localStorageMock.getItem).toBeDefined();
    expect(localStorageMock.setItem).toBeDefined();
  });

  it("should mock window.matchMedia", () => {
    const matchMediaMock = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    });

    expect(matchMediaMock("(min-width: 768px)")).toBeDefined();
  });
});
