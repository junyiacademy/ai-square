import {
  formatDate,
  formatDateTime,
  getRelativeTime,
  isToday,
  isWithinLastDays,
} from "../date";

describe("Date Utils", () => {
  describe("formatDate", () => {
    it("should format date object correctly", () => {
      const date = new Date("2024-01-15");
      const result = formatDate(date, "en-US");
      expect(result).toContain("January");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });

    it("should format date string correctly", () => {
      const result = formatDate("2024-01-15", "en-US");
      expect(result).toContain("January");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });

    it("should handle invalid date", () => {
      const result = formatDate("invalid-date");
      expect(result).toBe("Invalid Date");
    });

    it("should use default locale", () => {
      const date = new Date("2024-01-15");
      const result = formatDate(date);
      expect(result).toBeTruthy();
    });

    it("should format with different locales", () => {
      const date = new Date("2024-01-15");
      const resultZh = formatDate(date, "zh-CN");
      expect(resultZh).toContain("2024");

      const resultFr = formatDate(date, "fr-FR");
      expect(resultFr).toContain("2024");
    });
  });

  describe("formatDateTime", () => {
    it("should format date and time correctly", () => {
      const date = new Date("2024-01-15T14:30:00");
      const result = formatDateTime(date, "en-US");
      expect(result).toContain("January");
      expect(result).toContain("15");
      expect(result).toContain("2024");
      // Time format may vary by environment
    });

    it("should format date string with time", () => {
      const result = formatDateTime("2024-01-15T14:30:00", "en-US");
      expect(result).toContain("January");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });

    it("should handle invalid date", () => {
      const result = formatDateTime("invalid-date");
      expect(result).toBe("Invalid Date");
    });

    it("should use default locale", () => {
      const date = new Date("2024-01-15T14:30:00");
      const result = formatDateTime(date);
      expect(result).toBeTruthy();
    });
  });

  describe("getRelativeTime", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-15"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return "Today" for current date', () => {
      const result = getRelativeTime(new Date("2024-01-15"));
      expect(result).toBe("Today");
    });

    it('should return "Yesterday" for previous day', () => {
      const result = getRelativeTime(new Date("2024-01-14"));
      expect(result).toBe("Yesterday");
    });

    it("should return days ago for recent dates", () => {
      const result = getRelativeTime(new Date("2024-01-12"));
      expect(result).toBe("3 days ago");
    });

    it("should return weeks ago for dates within a month", () => {
      const result = getRelativeTime(new Date("2024-01-01"));
      expect(result).toBe("2 weeks ago");
    });

    it("should return week ago for single week", () => {
      const result = getRelativeTime(new Date("2024-01-08"));
      expect(result).toBe("1 week ago");
    });

    it("should return formatted date for older dates", () => {
      const result = getRelativeTime(new Date("2023-12-01"), "en-US");
      expect(result).toContain("December");
      expect(result).toContain("2023");
    });

    it("should handle string dates", () => {
      const result = getRelativeTime("2024-01-14");
      expect(result).toBe("Yesterday");
    });
  });

  describe("isToday", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-15"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return true for today", () => {
      expect(isToday(new Date("2024-01-15"))).toBe(true);
    });

    it("should return false for yesterday", () => {
      expect(isToday(new Date("2024-01-14"))).toBe(false);
    });

    it("should return false for tomorrow", () => {
      expect(isToday(new Date("2024-01-16"))).toBe(false);
    });

    it("should handle string dates", () => {
      expect(isToday("2024-01-15")).toBe(true);
      expect(isToday("2024-01-14")).toBe(false);
    });

    it("should ignore time component", () => {
      expect(isToday(new Date("2024-01-15T23:59:59"))).toBe(true);
      expect(isToday(new Date("2024-01-15T00:00:00"))).toBe(true);
    });
  });

  describe("isWithinLastDays", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-15"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return true for dates within range", () => {
      expect(isWithinLastDays(new Date("2024-01-14"), 7)).toBe(true);
      expect(isWithinLastDays(new Date("2024-01-10"), 7)).toBe(true);
      expect(isWithinLastDays(new Date("2024-01-15"), 7)).toBe(true);
    });

    it("should return false for dates outside range", () => {
      expect(isWithinLastDays(new Date("2024-01-07"), 7)).toBe(false);
      expect(isWithinLastDays(new Date("2024-01-01"), 7)).toBe(false);
    });

    it("should return false for future dates", () => {
      expect(isWithinLastDays(new Date("2024-01-16"), 7)).toBe(false);
      expect(isWithinLastDays(new Date("2024-01-20"), 7)).toBe(false);
    });

    it("should handle string dates", () => {
      expect(isWithinLastDays("2024-01-14", 7)).toBe(true);
      expect(isWithinLastDays("2024-01-01", 7)).toBe(false);
    });

    it("should handle edge case of exactly N days ago", () => {
      expect(isWithinLastDays(new Date("2024-01-08"), 7)).toBe(true);
    });

    it("should handle 0 days (today only)", () => {
      expect(isWithinLastDays(new Date("2024-01-15"), 0)).toBe(true);
      expect(isWithinLastDays(new Date("2024-01-14"), 0)).toBe(false);
    });
  });
});
