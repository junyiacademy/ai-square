/**
 * Translation Service Tests
 * 提升覆蓋率從 25.64% 到 95%+
 */

import { TranslationService } from "../translation-service";
import { VertexAIService } from "@/lib/ai/vertex-ai-service";
import { mockConsoleError } from "@/test-utils/helpers/console";

// Mock VertexAIService
jest.mock("@/lib/ai/vertex-ai-service");

// Mock console
const mockError = mockConsoleError();

describe("TranslationService", () => {
  let service: TranslationService;
  let mockSendMessage: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock
    mockSendMessage = jest.fn();
    (
      VertexAIService as jest.MockedClass<typeof VertexAIService>
    ).mockImplementation(
      () =>
        ({
          sendMessage: mockSendMessage,
          model: "gemini-2.5-flash",
          temperature: 0.3,
          systemPrompt:
            "You are a professional translator specializing in educational feedback translation.",
        }) as any,
    );

    service = new TranslationService();
  });

  describe("constructor", () => {
    it("initializes VertexAIService with correct config", () => {
      expect(VertexAIService).toHaveBeenCalledWith({
        systemPrompt:
          "You are a professional translator specializing in educational feedback translation.",
        temperature: 0.3,
        model: "gemini-2.5-flash",
      });
    });
  });

  describe("translateFeedback", () => {
    const originalFeedback =
      "Great job! You have shown excellent understanding of AI concepts.";

    beforeEach(() => {
      mockSendMessage.mockResolvedValue({
        content: "Translation: 做得好！您展現了對 AI 概念的優秀理解。",
      });
    });

    it("translates feedback to Traditional Chinese (zhTW)", async () => {
      const result = await service.translateFeedback(originalFeedback, "zhTW");

      expect(mockSendMessage).toHaveBeenCalled();
      const callArg = mockSendMessage.mock.calls[0][0];
      expect(callArg).toContain("Traditional Chinese (繁體中文)");
      expect(callArg).toContain(originalFeedback);
      expect(result).toBe("做得好！您展現了對 AI 概念的優秀理解。");
    });

    it("handles zh-TW format correctly", async () => {
      await service.translateFeedback(originalFeedback, "zh-TW");

      expect(mockSendMessage).toHaveBeenCalled();
      const callArg = mockSendMessage.mock.calls[0][0];
      expect(callArg).toContain("Traditional Chinese (繁體中文)");
    });

    it("translates feedback to Simplified Chinese (zhCN)", async () => {
      await service.translateFeedback(originalFeedback, "zhCN");

      expect(mockSendMessage).toHaveBeenCalled();
      const callArg = mockSendMessage.mock.calls[0][0];
      expect(callArg).toContain("Simplified Chinese (简体中文)");
    });

    it("handles zh-CN format correctly", async () => {
      await service.translateFeedback(originalFeedback, "zh-CN");

      expect(mockSendMessage).toHaveBeenCalled();
      const callArg = mockSendMessage.mock.calls[0][0];
      expect(callArg).toContain("Simplified Chinese (简体中文)");
    });

    it("includes career field context when provided", async () => {
      const careerField = "Software Engineering";
      await service.translateFeedback(originalFeedback, "zhTW", careerField);

      const callArg = mockSendMessage.mock.calls[0][0];
      expect(callArg).toContain(
        `Use appropriate terminology for the ${careerField} field`,
      );
    });

    it("excludes career field instruction when not provided", async () => {
      await service.translateFeedback(originalFeedback, "zhTW");

      const callArg = mockSendMessage.mock.calls[0][0];
      expect(callArg).not.toContain("Use appropriate terminology");
    });

    it("handles unsupported language codes", async () => {
      await service.translateFeedback(originalFeedback, "unknown-lang");

      expect(mockSendMessage).toHaveBeenCalled();
      const callArg = mockSendMessage.mock.calls[0][0];
      expect(callArg).toContain("unknown-lang");
    });

    it("supports all documented languages", async () => {
      const languages = [
        ["en", "English"],
        ["es", "Spanish"],
        ["ja", "Japanese"],
        ["ko", "Korean"],
        ["fr", "French"],
        ["de", "German"],
        ["ru", "Russian"],
        ["it", "Italian"],
        ["pt", "Portuguese"],
        ["ar", "Arabic"],
        ["id", "Indonesian"],
        ["th", "Thai"],
      ];

      for (const [code, name] of languages) {
        mockSendMessage.mockClear();
        await service.translateFeedback(originalFeedback, code);
        expect(mockSendMessage).toHaveBeenCalled();
        const callArg = mockSendMessage.mock.calls[0][0];
        expect(callArg).toContain(name);
      }
    });

    it("cleans up translation labels from response", async () => {
      const responsesWithLabels = [
        "Translation: Translated text",
        "Translated: Translated text",
        "Spanish Translation: Translated text",
        "Translation Snippet 1: Translated text",
        "• Translated text",
        "  Translated text  ",
      ];

      for (const response of responsesWithLabels) {
        mockSendMessage.mockResolvedValueOnce({ content: response });
        const result = await service.translateFeedback(originalFeedback, "es");
        expect(result).toBe("Translated text");
      }
    });

    it("handles multi-line translations correctly", async () => {
      mockSendMessage.mockResolvedValue({
        content: "Translation:\nLine 1\nLine 2\nLine 3",
      });

      const result = await service.translateFeedback(originalFeedback, "es");
      expect(result).toBe("Line 1\nLine 2\nLine 3");
    });

    it("handles empty response content", async () => {
      mockSendMessage.mockResolvedValue({ content: "" });

      const result = await service.translateFeedback(originalFeedback, "es");
      expect(result).toBe("");
    });

    it("throws error when AI service fails", async () => {
      const error = new Error("AI service error");
      mockSendMessage.mockRejectedValue(error);

      await expect(
        service.translateFeedback(originalFeedback, "zhTW"),
      ).rejects.toThrow("Failed to translate feedback to zhTW");

      expect(mockError).toHaveBeenCalledWith("Translation failed:", error);
    });

    it("includes all required prompt elements", async () => {
      await service.translateFeedback(originalFeedback, "es", "Data Science");

      const prompt = mockSendMessage.mock.calls[0][0];
      expect(prompt).toContain("Translate the following educational feedback");
      expect(prompt).toContain("Spanish");
      expect(prompt).toContain(originalFeedback);
      expect(prompt).toContain("Provide ONLY the translation");
      expect(prompt).toContain("Maintain all formatting");
      expect(prompt).toContain("Keep proper names and signatures unchanged");
      expect(prompt).toContain(
        "Preserve the encouraging and professional tone",
      );
      expect(prompt).toContain("Data Science");
      expect(prompt).toContain("Translate now:");
    });
  });

  describe("translateFeedbackBatch", () => {
    const originalFeedback = "Well done!";
    const targetLanguages = ["zhTW", "es", "ja"];

    beforeEach(() => {
      mockSendMessage
        .mockResolvedValueOnce({ content: "做得好！" })
        .mockResolvedValueOnce({ content: "¡Bien hecho!" })
        .mockResolvedValueOnce({ content: "よくできました！" });
    });

    it("translates to multiple languages in parallel", async () => {
      const results = await service.translateFeedbackBatch(
        originalFeedback,
        targetLanguages,
      );

      expect(results).toEqual({
        zhTW: "做得好！",
        es: "¡Bien hecho!",
        ja: "よくできました！",
      });

      expect(mockSendMessage).toHaveBeenCalledTimes(3);
    });

    it("includes career field in all translations", async () => {
      await service.translateFeedbackBatch(
        originalFeedback,
        targetLanguages,
        "Healthcare",
      );

      expect(mockSendMessage).toHaveBeenCalledTimes(3);
      for (let i = 0; i < 3; i++) {
        expect(mockSendMessage.mock.calls[i][0]).toContain("Healthcare");
      }
    });

    it("handles partial failures gracefully", async () => {
      mockSendMessage.mockReset();
      mockSendMessage
        .mockResolvedValueOnce({ content: "做得好！" })
        .mockRejectedValueOnce(new Error("Translation failed"))
        .mockResolvedValueOnce({ content: "よくできました！" });

      const results = await service.translateFeedbackBatch(
        originalFeedback,
        targetLanguages,
      );

      expect(results).toEqual({
        zhTW: "做得好！",
        es: originalFeedback, // Falls back to original
        ja: "よくできました！",
      });

      expect(mockError).toHaveBeenCalledWith(
        "Translation failed for es:",
        expect.any(Error),
      );
    });

    it("handles empty language array", async () => {
      const results = await service.translateFeedbackBatch(
        originalFeedback,
        [],
      );

      expect(results).toEqual({});
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it("handles all failures", async () => {
      mockError.mockClear();
      mockSendMessage.mockReset();
      mockSendMessage.mockRejectedValue(new Error("Service unavailable"));

      const results = await service.translateFeedbackBatch(
        originalFeedback,
        targetLanguages,
      );

      expect(results).toEqual({
        zhTW: originalFeedback,
        es: originalFeedback,
        ja: originalFeedback,
      });

      // Each failed translation logs an error, plus one for each language in translateFeedbackBatch
      expect(mockError.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("static methods", () => {
    describe("needsTranslation", () => {
      it("returns true when versions is undefined", () => {
        expect(TranslationService.needsTranslation(undefined, "es")).toBe(true);
      });

      it("returns true when language not in versions", () => {
        const versions = { en: "Hello", zhTW: "你好" };
        expect(TranslationService.needsTranslation(versions, "es")).toBe(true);
      });

      it("returns false when language exists in versions", () => {
        const versions = { en: "Hello", es: "Hola" };
        expect(TranslationService.needsTranslation(versions, "es")).toBe(false);
      });

      it("returns true for empty string translations", () => {
        const versions = { en: "Hello", es: "" };
        expect(TranslationService.needsTranslation(versions, "es")).toBe(true);
      });
    });

    describe("getFeedbackByLanguage", () => {
      const versions = {
        en: "English feedback",
        zhTW: "中文回饋",
        es: "Retroalimentación en español",
      };

      it("returns feedback in requested language", () => {
        expect(TranslationService.getFeedbackByLanguage(versions, "zhTW")).toBe(
          "中文回饋",
        );
      });

      it("falls back to English when language not available", () => {
        expect(TranslationService.getFeedbackByLanguage(versions, "fr")).toBe(
          "English feedback",
        );
      });

      it("uses custom fallback language", () => {
        expect(
          TranslationService.getFeedbackByLanguage(versions, "fr", "es"),
        ).toBe("Retroalimentación en español");
      });

      it("returns first available version when neither requested nor fallback available", () => {
        const limitedVersions = { zhTW: "中文", ja: "日本語" };
        const result = TranslationService.getFeedbackByLanguage(
          limitedVersions,
          "fr",
        );
        expect(["中文", "日本語"]).toContain(result);
      });

      it("returns null when versions is undefined", () => {
        expect(TranslationService.getFeedbackByLanguage(undefined, "en")).toBe(
          null,
        );
      });

      it("returns null when versions is empty", () => {
        expect(TranslationService.getFeedbackByLanguage({}, "en")).toBe(null);
      });

      it("handles empty string values", () => {
        const versionsWithEmpty = { en: "", zhTW: "中文" };
        expect(
          TranslationService.getFeedbackByLanguage(versionsWithEmpty, "en"),
        ).toBe("");
      });
    });
  });

  describe("edge cases", () => {
    it("handles very long feedback text", async () => {
      const longFeedback = "A".repeat(5000);
      mockSendMessage.mockResolvedValue({ content: "B".repeat(5000) });

      const result = await service.translateFeedback(longFeedback, "es");
      expect(result).toBe("B".repeat(5000));
    });

    it("handles special characters in feedback", async () => {
      const specialFeedback =
        'Great! You\'ve mastered "AI & ML" <concepts> with 100% accuracy.';
      mockSendMessage.mockResolvedValue({
        content:
          '¡Excelente! Has dominado los <conceptos> de "AI y ML" con 100% de precisión.',
      });

      const result = await service.translateFeedback(specialFeedback, "es");
      expect(result).toBe(
        '¡Excelente! Has dominado los <conceptos> de "AI y ML" con 100% de precisión.',
      );
    });

    it("handles markdown formatting", async () => {
      const markdownFeedback =
        "**Excellent!** You showed:\n- Good understanding\n- *Creative* solutions";
      mockSendMessage.mockResolvedValue({
        content:
          "**¡Excelente!** Mostraste:\n- Buena comprensión\n- Soluciones *creativas*",
      });

      const result = await service.translateFeedback(markdownFeedback, "es");
      expect(result).toContain("**¡Excelente!**");
      expect(result).toContain("*creativas*");
    });

    it("handles concurrent translation requests", async () => {
      mockSendMessage
        .mockResolvedValueOnce({ content: "Translation 1" })
        .mockResolvedValueOnce({ content: "Translation 2" })
        .mockResolvedValueOnce({ content: "Translation 3" });

      const promises = [
        service.translateFeedback("Text 1", "es"),
        service.translateFeedback("Text 2", "fr"),
        service.translateFeedback("Text 3", "ja"),
      ];

      const results = await Promise.all(promises);
      expect(results).toEqual([
        "Translation 1",
        "Translation 2",
        "Translation 3",
      ]);
    });
  });
});
