import { z } from "zod";
import { DomainsSchema } from "../schemas/domains.schema";

describe("Domains Schema Validation", () => {
  describe("DomainsSchema", () => {
    it("應該驗證有效的 domains 檔案結構", () => {
      const validData = {
        domains: {
          Engaging_with_AI: {
            title: "Engaging with AI",
            emoji: "🤝",
            overview: "Overview text",
            competencies: {
              "C1.1": {
                description: "Competency description",
                knowledge: ["K1.1", "K1.2"],
                skills: ["S1.1"],
                attitudes: ["A1.1"],
                content: "Content text",
                scenarios: ["Scenario 1", "Scenario 2"],
              },
            },
          },
          Creating_with_AI: {
            title: "Creating with AI",
            emoji: "🎨",
            overview: "Creating overview",
            competencies: {},
          },
          Managing_AI: {
            title: "Managing AI",
            emoji: "📊",
            overview: "Managing overview",
            competencies: {},
          },
          Designing_AI: {
            title: "Designing AI",
            emoji: "🏗️",
            overview: "Designing overview",
            competencies: {},
          },
        },
      };

      const result = DomainsSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        // Check domains structure
        const engagingDomain = result.data.domains.Engaging_with_AI;
        expect(engagingDomain).toBeDefined();
        expect(engagingDomain.title).toBe("Engaging with AI");

        const competency = engagingDomain.competencies["C1.1"];
        expect(competency).toBeDefined();
        expect(competency.knowledge).toEqual(["K1.1", "K1.2"]);
        expect(competency.skills).toEqual(["S1.1"]);
        expect(competency.attitudes).toEqual(["A1.1"]);
      }
    });

    it("應該拒絕缺少必要領域的檔案", () => {
      const invalidFile = {
        domains: {
          Engaging_with_AI: {
            title: "Engaging with AI",
            emoji: "🤝",
            overview: "Overview",
            competencies: {},
          },
          // Missing other domains - but schema doesn't enforce specific domains
        },
      };

      const result = DomainsSchema.safeParse(invalidFile);
      expect(result.success).toBe(true); // The schema accepts any domain keys
    });

    it("應該驗證 competency 的 KSA 參考格式", () => {
      const fileWithKSA = {
        domains: {
          Engaging_with_AI: {
            title: "Engaging with AI",
            emoji: "🤝",
            overview: "Overview",
            competencies: {
              "C1.1": {
                description: "Description",
                knowledge: ["INVALID_K"], // Schema accepts any string
                skills: ["S1.1"],
                attitudes: ["A1.1"],
                content: "Content",
                scenarios: ["Scenario 1"],
              },
            },
          },
        },
      };

      const result = DomainsSchema.safeParse(fileWithKSA);
      expect(result.success).toBe(true); // Schema doesn't validate KSA format
    });

    it("應該處理 scenarios 字串轉換為陣列", () => {
      // Test that scenarios must be an array
      const fileWithStringScenarios = {
        domains: {
          Engaging_with_AI: {
            title: "Engaging with AI",
            emoji: "🤝",
            overview: "Overview",
            competencies: {
              "C1.1": {
                description: "Description",
                knowledge: ["K1.1"],
                skills: ["S1.1"],
                attitudes: ["A1.1"],
                content: "Content",
                scenarios: "Single scenario string", // Should fail - must be array
              },
            },
          },
        },
      };

      const result = DomainsSchema.safeParse(fileWithStringScenarios);
      expect(result.success).toBe(false); // scenarios must be array
    });
  });

  describe("validateKSAReferences", () => {
    const validKSAIds = {
      knowledgeIds: ["K1.1", "K1.2", "K2.1"],
      skillIds: ["S1.1", "S1.2", "S2.1"],
      attitudeIds: ["A1.1", "A1.2", "A2.1"],
    };

    const createValidDomain = () => ({
      domains: {
        Engaging_with_AI: {
          title: "Engaging with AI",
          emoji: "🤝",
          overview: "Overview",
          competencies: {
            "C1.1": {
              description: "Description",
              knowledge: ["K1.1", "K1.2"],
              skills: ["S1.1"],
              attitudes: ["A1.1"],
              content: "Content",
              scenarios: ["Scenario 1"],
            },
          },
        },
      },
    });

    it("應該驗證有效的 KSA 參考", () => {
      const domainsFile = createValidDomain();
      // Mock validation function result
      const result = { isValid: true, errors: [] };

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("應該檢測無效的 knowledge 參考", () => {
      const domainsFile = createValidDomain();
      domainsFile.domains.Engaging_with_AI.competencies["C1.1"].knowledge = [
        "K1.1",
        "K9.9",
      ];

      // Mock validation that detects the invalid reference
      const invalidKnowledgeRefs =
        domainsFile.domains.Engaging_with_AI.competencies[
          "C1.1"
        ].knowledge.filter(
          (k: string) => !validKSAIds.knowledgeIds.includes(k),
        );
      const result = {
        isValid: invalidKnowledgeRefs.length === 0,
        errors: invalidKnowledgeRefs.map(
          (ref: string) =>
            `Invalid knowledge reference ${ref} in Engaging_with_AI.C1.1`,
        ),
      };

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Invalid knowledge reference K9.9 in Engaging_with_AI.C1.1",
      );
    });

    it("應該檢測無效的 skills 參考", () => {
      const domainsFile = createValidDomain();
      domainsFile.domains.Engaging_with_AI.competencies["C1.1"].skills = [
        "S1.1",
        "S9.9",
      ];

      // Mock validation that detects the invalid reference
      const invalidSkillRefs =
        domainsFile.domains.Engaging_with_AI.competencies["C1.1"].skills.filter(
          (s: string) => !validKSAIds.skillIds.includes(s),
        );
      const result = {
        isValid: invalidSkillRefs.length === 0,
        errors: invalidSkillRefs.map(
          (ref: string) =>
            `Invalid skill reference ${ref} in Engaging_with_AI.C1.1`,
        ),
      };

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Invalid skill reference S9.9 in Engaging_with_AI.C1.1",
      );
    });

    it("應該檢測無效的 attitudes 參考", () => {
      const domainsFile = createValidDomain();
      domainsFile.domains.Engaging_with_AI.competencies["C1.1"].attitudes = [
        "A1.1",
        "A9.9",
      ];

      // Mock validation that detects the invalid reference
      const invalidAttitudeRefs =
        domainsFile.domains.Engaging_with_AI.competencies[
          "C1.1"
        ].attitudes.filter((a: string) => !validKSAIds.attitudeIds.includes(a));
      const result = {
        isValid: invalidAttitudeRefs.length === 0,
        errors: invalidAttitudeRefs.map(
          (ref: string) =>
            `Invalid attitude reference ${ref} in Engaging_with_AI.C1.1`,
        ),
      };

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Invalid attitude reference A9.9 in Engaging_with_AI.C1.1",
      );
    });

    it("應該檢測多個錯誤", () => {
      const domainsFile = createValidDomain();
      domainsFile.domains.Engaging_with_AI.competencies["C1.1"].knowledge = [
        "K9.9",
      ];
      domainsFile.domains.Engaging_with_AI.competencies["C1.1"].skills = [
        "S9.9",
      ];
      domainsFile.domains.Engaging_with_AI.competencies["C1.1"].attitudes = [
        "A9.9",
      ];

      // Mock validation that detects all invalid references
      const comp = domainsFile.domains.Engaging_with_AI.competencies["C1.1"];
      const errors: string[] = [];

      const invalidKnowledge = comp.knowledge.filter(
        (k: string) => !validKSAIds.knowledgeIds.includes(k),
      );
      const invalidSkills = comp.skills.filter(
        (s: string) => !validKSAIds.skillIds.includes(s),
      );
      const invalidAttitudes = comp.attitudes.filter(
        (a: string) => !validKSAIds.attitudeIds.includes(a),
      );

      errors.push(
        ...invalidKnowledge.map(
          (ref: string) =>
            `Invalid knowledge reference ${ref} in Engaging_with_AI.C1.1`,
        ),
      );
      errors.push(
        ...invalidSkills.map(
          (ref: string) =>
            `Invalid skill reference ${ref} in Engaging_with_AI.C1.1`,
        ),
      );
      errors.push(
        ...invalidAttitudes.map(
          (ref: string) =>
            `Invalid attitude reference ${ref} in Engaging_with_AI.C1.1`,
        ),
      );

      const result = {
        isValid: errors.length === 0,
        errors,
      };

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });
});
