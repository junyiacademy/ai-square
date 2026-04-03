import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageSelector } from "../LanguageSelector";

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: {
      language: "en",
      changeLanguage: jest.fn(),
    },
  }),
}));

describe("LanguageSelector", () => {
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn((key) => localStorageMock[key] || null),
        setItem: jest.fn((key, value) => {
          localStorageMock[key] = value;
        }),
        clear: jest.fn(() => {
          localStorageMock = {};
        }),
      },
      writable: true,
    });
  });

  it("renders language selector", () => {
    render(<LanguageSelector />);

    const select = screen.getByLabelText("選擇語言");
    expect(select).toBeInTheDocument();
  });

  it("displays supported language options with flags", () => {
    render(<LanguageSelector />);

    const select = screen.getByLabelText("選擇語言");

    // Check if supported language options are present with flags
    expect(select).toHaveTextContent("English");
    expect(select).toHaveTextContent("繁體中文");
    expect(select).toHaveTextContent("简体中文");
    // Check that flags are present
    expect(select).toHaveTextContent("🇺🇸");
    expect(select).toHaveTextContent("🇹🇼");
    expect(select).toHaveTextContent("🇨🇳");
    // Check that all languages are present
    expect(select).toHaveTextContent("Español");
    expect(select).toHaveTextContent("日本語");
    expect(select).toHaveTextContent("한국어");
    expect(select).toHaveTextContent("Français");
    expect(select).toHaveTextContent("Deutsch");
  });

  it("changes language when option is selected", () => {
    const mockChangeLanguage = jest.fn();

    jest.spyOn(require("react-i18next"), "useTranslation").mockReturnValue({
      i18n: {
        language: "en",
        changeLanguage: mockChangeLanguage,
      },
    });

    render(<LanguageSelector />);

    const select = screen.getByLabelText("選擇語言");
    fireEvent.change(select, { target: { value: "zhTW" } });

    expect(mockChangeLanguage).toHaveBeenCalledWith("zhTW");
  });

  it("saves language preference to localStorage", () => {
    render(<LanguageSelector />);

    const select = screen.getByLabelText("選擇語言");
    fireEvent.change(select, { target: { value: "zhCN" } });

    expect(localStorage.getItem("ai-square-language")).toBe("zhCN");
  });

  it("dispatches custom event when language changes", () => {
    const mockDispatchEvent = jest.spyOn(window, "dispatchEvent");

    render(<LanguageSelector />);

    const select = screen.getByLabelText("選擇語言");
    fireEvent.change(select, { target: { value: "zhTW" } });

    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "language-changed",
        detail: { language: "zhTW" },
      }),
    );

    mockDispatchEvent.mockRestore();
  });
});
