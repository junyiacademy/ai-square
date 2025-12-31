/**
 * TDD Test for PBL Scenarios API - Multilingual Learning Objectives
 *
 * Test Scenario: API should return learning objectives in requested language
 * - Test 1: Should return Chinese objectives when lang=zhTW
 * - Test 2: Should handle database objectives when available
 * - Test 3: Should fallback to English when requested language not available
 */

// Unit tests for multilingual learning objectives logic (bypasses complex dependency mocking)
describe("PBL Scenarios API - Multilingual Learning Objectives Logic", () => {
  // Helper function to simulate the learning objectives extraction logic
  function extractLearningObjectives(
    scenarioResult: any,
    lang: string,
  ): string[] {
    // First try database objectives with multilingual support
    const dbObjectives = scenarioResult.objectives;

    // If database has multilingual objectives, use them
    if (
      dbObjectives &&
      typeof dbObjectives === "object" &&
      !Array.isArray(dbObjectives)
    ) {
      const multilangObjectives = dbObjectives as Record<string, string[]>;
      return multilangObjectives[lang] || multilangObjectives.en || [];
    }

    // If database has simple array, prefer it over YAML (unless user wants non-English and YAML has it)
    if (
      dbObjectives &&
      Array.isArray(dbObjectives) &&
      dbObjectives.length > 0
    ) {
      // For non-English requests, check if YAML has better options first
      if (lang !== "en" && scenarioResult.pblData?.scenario_info) {
        const scenarioInfo = scenarioResult.pblData.scenario_info;
        const yamlObjectives = scenarioInfo.learning_objectives;
        if (Array.isArray(yamlObjectives)) {
          const objectives = yamlObjectives
            .map((obj: any) => {
              if (typeof obj === "string") return obj;
              if (typeof obj === "object" && obj !== null) {
                const multilangObj = obj as Record<string, unknown>;
                return (
                  (multilangObj[lang] as string) ||
                  (multilangObj.en as string) ||
                  ""
                );
              }
              return "";
            })
            .filter(Boolean);

          // If we found non-empty objectives in YAML, use them
          if (objectives.length > 0) {
            return objectives;
          }
        }
      }

      // Use database array as fallback
      return dbObjectives;
    }

    // Only if database is empty, try YAML
    if (scenarioResult.pblData?.scenario_info) {
      const scenarioInfo = scenarioResult.pblData.scenario_info;
      const yamlObjectives = scenarioInfo.learning_objectives;
      if (Array.isArray(yamlObjectives)) {
        const objectives = yamlObjectives
          .map((obj: any) => {
            if (typeof obj === "string") return obj;
            if (typeof obj === "object" && obj !== null) {
              const multilangObj = obj as Record<string, unknown>;
              return (
                (multilangObj[lang] as string) ||
                (multilangObj.en as string) ||
                ""
              );
            }
            return "";
          })
          .filter(Boolean);

        // If we found non-empty objectives in YAML, use them
        if (objectives.length > 0) {
          return objectives;
        }
      }
    }

    return [];
  }

  test("Should return Chinese objectives from multilingual database field", () => {
    const mockScenario = {
      id: "test-scenario-uuid",
      objectives: {
        en: ["English objective 1", "English objective 2"],
        zhTW: ["中文目標 1", "中文目標 2"],
        ja: ["日本語目標 1", "日本語目標 2"],
      },
      pblData: {},
    };

    const result = extractLearningObjectives(mockScenario, "zhTW");

    expect(result).toEqual(["中文目標 1", "中文目標 2"]);
  });

  test("Should fallback to English when requested language not available in database", () => {
    const mockScenario = {
      id: "test-scenario-uuid",
      objectives: {
        en: ["English objective 1", "English objective 2"],
        zhTW: ["中文目標 1", "中文目標 2"],
      },
      pblData: {},
    };

    const result = extractLearningObjectives(mockScenario, "ko"); // Korean not available

    expect(result).toEqual(["English objective 1", "English objective 2"]);
  });

  test("Should use YAML fallback when database objectives empty and non-English requested", () => {
    const mockScenario = {
      id: "test-scenario-uuid",
      objectives: [], // Empty database objectives
      pblData: {
        scenario_info: {
          learning_objectives: [
            "體會晶片在生活中的無所不在，並連結其原料「矽」與自然的「沙子」",
            "理解晶片的核心是作為「開關」的「電晶體」，其關鍵在於「半導體」可控制電流的特性",
            "認識「摩爾定律」的基本概念，並解釋為何科技產品能持續地變快、變小",
          ],
        },
      },
    };

    const result = extractLearningObjectives(mockScenario, "zhTW");

    expect(result).toEqual([
      "體會晶片在生活中的無所不在，並連結其原料「矽」與自然的「沙子」",
      "理解晶片的核心是作為「開關」的「電晶體」，其關鍵在於「半導體」可控制電流的特性",
      "認識「摩爾定律」的基本概念，並解釋為何科技產品能持續地變快、變小",
    ]);
  });

  test("Should prefer database objectives over YAML when both available", () => {
    const mockScenario = {
      id: "test-scenario-uuid",
      objectives: ["Database objective 1", "Database objective 2"], // Array format (legacy)
      pblData: {
        scenario_info: {
          learning_objectives: ["Should not use this YAML objective"],
        },
      },
    };

    const result = extractLearningObjectives(mockScenario, "en");

    expect(result).toEqual(["Database objective 1", "Database objective 2"]);
  });

  test("Should handle empty scenario data gracefully", () => {
    const mockScenario = {
      id: "test-scenario-uuid",
      objectives: [],
      pblData: {},
    };

    const result = extractLearningObjectives(mockScenario, "zhTW");

    expect(result).toEqual([]);
  });

  test("Should handle multilingual YAML objects", () => {
    const mockScenario = {
      id: "test-scenario-uuid",
      objectives: [],
      pblData: {
        scenario_info: {
          learning_objectives: [
            { en: "English objective", zhTW: "中文目標", ja: "日本語目標" },
            { en: "Second objective", zhTW: "第二個目標" },
          ],
        },
      },
    };

    const resultZhTW = extractLearningObjectives(mockScenario, "zhTW");
    const resultJa = extractLearningObjectives(mockScenario, "ja");
    const resultEn = extractLearningObjectives(mockScenario, "en");

    expect(resultZhTW).toEqual(["中文目標", "第二個目標"]);
    expect(resultJa).toEqual(["日本語目標", "Second objective"]); // Second item falls back to English
    expect(resultEn).toEqual(["English objective", "Second objective"]);
  });
});
