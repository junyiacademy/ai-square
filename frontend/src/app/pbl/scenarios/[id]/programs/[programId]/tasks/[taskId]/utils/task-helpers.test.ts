import { getQualitativeRating, getLocalizedField } from "./task-helpers";

describe("task-helpers", () => {
  describe("getQualitativeRating", () => {
    it("should return Perfect rating for scores >= 91", () => {
      const result = getQualitativeRating(91);
      expect(result.label).toBe("Perfect");
      expect(result.color).toBe("text-purple-600 dark:text-purple-400");
      expect(result.i18nKey).toBe("pbl:complete.rating.perfect");
    });

    it("should return Perfect rating for score 100", () => {
      const result = getQualitativeRating(100);
      expect(result.label).toBe("Perfect");
    });

    it("should return Great rating for scores 71-90", () => {
      const result71 = getQualitativeRating(71);
      expect(result71.label).toBe("Great");
      expect(result71.color).toBe("text-blue-600 dark:text-blue-400");
      expect(result71.i18nKey).toBe("pbl:complete.rating.great");

      const result90 = getQualitativeRating(90);
      expect(result90.label).toBe("Great");
    });

    it("should return Good rating for scores < 71", () => {
      const result70 = getQualitativeRating(70);
      expect(result70.label).toBe("Good");
      expect(result70.color).toBe("text-green-600 dark:text-green-400");
      expect(result70.i18nKey).toBe("pbl:complete.rating.good");

      const result0 = getQualitativeRating(0);
      expect(result0.label).toBe("Good");

      const result50 = getQualitativeRating(50);
      expect(result50.label).toBe("Good");
    });

    it("should handle boundary values correctly", () => {
      expect(getQualitativeRating(91).label).toBe("Perfect");
      expect(getQualitativeRating(90.99).label).toBe("Great");
      expect(getQualitativeRating(71).label).toBe("Great");
      expect(getQualitativeRating(70.99).label).toBe("Good");
    });
  });

  describe("getLocalizedField", () => {
    it("should return localized field when it exists", () => {
      const obj = {
        title: "Default Title",
        title_en: "English Title",
        title_zh: "中文標題",
      };

      expect(getLocalizedField(obj, "title", "en")).toBe("English Title");
      expect(getLocalizedField(obj, "title", "zh")).toBe("中文標題");
    });

    it("should return default field when localized field does not exist", () => {
      const obj = {
        title: "Default Title",
        title_en: "English Title",
      };

      expect(getLocalizedField(obj, "title", "fr")).toBe("Default Title");
    });

    it("should handle null object", () => {
      expect(getLocalizedField(null, "title", "en")).toBe("");
    });

    it("should handle undefined object", () => {
      expect(getLocalizedField(undefined, "title", "en")).toBe("");
    });

    it("should handle missing field", () => {
      const obj = {
        description: "Some description",
      };

      expect(getLocalizedField(obj, "title", "en")).toBe("");
    });

    it("should handle empty string values", () => {
      const obj = {
        title: "",
        title_en: "English Title",
      };

      expect(getLocalizedField(obj, "title", "en")).toBe("English Title");
    });

    it("should convert non-string values to string", () => {
      const obj = {
        count: 42,
        count_en: 100,
      };

      expect(getLocalizedField(obj, "count", "en")).toBe("100");
      expect(getLocalizedField(obj, "count", "fr")).toBe("42");
    });

    it("should prioritize localized field over default", () => {
      const obj = {
        title: "Default",
        title_en: "Localized",
      };

      expect(getLocalizedField(obj, "title", "en")).toBe("Localized");
    });

    it("should handle objects with only localized fields", () => {
      const obj = {
        title_en: "English Only",
      };

      expect(getLocalizedField(obj, "title", "en")).toBe("English Only");
      expect(getLocalizedField(obj, "title", "zh")).toBe("");
    });

    it("should work with different language codes", () => {
      const obj = {
        title: "Default",
        title_en: "English",
        title_zh: "Chinese",
        title_es: "Spanish",
        title_fr: "French",
      };

      expect(getLocalizedField(obj, "title", "en")).toBe("English");
      expect(getLocalizedField(obj, "title", "zh")).toBe("Chinese");
      expect(getLocalizedField(obj, "title", "es")).toBe("Spanish");
      expect(getLocalizedField(obj, "title", "fr")).toBe("French");
    });
  });
});
