/**
 * GAP-12: Multi-language YAML Validation Script
 *
 * Validates all Discovery career YAML files:
 * 1. All language variants exist for each career
 * 2. Required fields are present (metadata, world_setting, starting_scenario, skill_tree)
 * 3. skill_tree has >= 4 core_skills
 *
 * Usage: npm run validate:discovery
 */

import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";

// ── Config ────────────────────────────────────────────────────────────────────

const DISCOVERY_DATA_DIR = path.join(__dirname, "../public/discovery_data");

const REQUIRED_LANGUAGES = [
  "en",
  "zhTW",
  "zhCN",
  "ja",
  "ko",
  "ar",
  "de",
  "es",
  "fr",
  "id",
  "it",
  "pt",
  "ru",
  "th",
];

const REQUIRED_FIELDS = [
  "metadata",
  "world_setting",
  "starting_scenario",
  "skill_tree",
] as const;

const MIN_CORE_SKILLS = 4;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ValidationIssue {
  career: string;
  lang: string;
  issue: string;
  severity: "error" | "warning";
}

interface ValidationReport {
  totalCareers: number;
  totalFiles: number;
  issues: ValidationIssue[];
  errors: number;
  warnings: number;
  passed: boolean;
}

// ── Validation Logic ──────────────────────────────────────────────────────────

async function validateCareer(
  careerId: string,
  careerDir: string,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  for (const lang of REQUIRED_LANGUAGES) {
    const fileName = `${careerId}_${lang}.yml`;
    const filePath = path.join(careerDir, fileName);

    // 1. Check file exists
    try {
      await fs.access(filePath);
    } catch {
      issues.push({
        career: careerId,
        lang,
        issue: `Missing language file: ${fileName}`,
        severity: "error",
      });
      continue;
    }

    // 2. Parse and validate content
    let data: Record<string, unknown>;
    try {
      const content = await fs.readFile(filePath, "utf8");
      data = yaml.load(content) as Record<string, unknown>;
    } catch (err) {
      issues.push({
        career: careerId,
        lang,
        issue: `YAML parse error: ${(err as Error).message}`,
        severity: "error",
      });
      continue;
    }

    // 3. Check required top-level fields
    for (const field of REQUIRED_FIELDS) {
      if (!data[field]) {
        issues.push({
          career: careerId,
          lang,
          issue: `Missing required field: ${field}`,
          severity: "error",
        });
      }
    }

    // 4. Validate skill_tree has >= MIN_CORE_SKILLS core_skills
    const skillTree = data.skill_tree as Record<string, unknown> | undefined;
    if (skillTree) {
      const coreSkills = skillTree.core_skills;
      if (!Array.isArray(coreSkills)) {
        issues.push({
          career: careerId,
          lang,
          issue: "skill_tree.core_skills must be an array",
          severity: "error",
        });
      } else if (coreSkills.length < MIN_CORE_SKILLS) {
        issues.push({
          career: careerId,
          lang,
          issue: `skill_tree.core_skills has ${coreSkills.length} skills (minimum ${MIN_CORE_SKILLS})`,
          severity: "warning",
        });
      }
    }
  }

  return issues;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Discovery YAML Validation\n" + "=".repeat(50));

  let careerDirs: string[];
  try {
    const entries = await fs.readdir(DISCOVERY_DATA_DIR, { withFileTypes: true });
    careerDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    console.error(`Cannot read discovery data directory: ${DISCOVERY_DATA_DIR}`);
    process.exit(1);
  }

  if (careerDirs.length === 0) {
    console.error("No career directories found.");
    process.exit(1);
  }

  const report: ValidationReport = {
    totalCareers: careerDirs.length,
    totalFiles: careerDirs.length * REQUIRED_LANGUAGES.length,
    issues: [],
    errors: 0,
    warnings: 0,
    passed: false,
  };

  for (const careerId of careerDirs) {
    const careerDir = path.join(DISCOVERY_DATA_DIR, careerId);
    const issues = await validateCareer(careerId, careerDir);
    report.issues.push(...issues);
    process.stdout.write(issues.length === 0 ? "." : "F");
  }

  console.log("\n");

  report.errors = report.issues.filter((i) => i.severity === "error").length;
  report.warnings = report.issues.filter((i) => i.severity === "warning").length;
  report.passed = report.errors === 0;

  // Print issues
  if (report.issues.length > 0) {
    console.log("Issues Found:");
    console.log("-".repeat(50));
    for (const issue of report.issues) {
      const prefix = issue.severity === "error" ? "ERROR" : "WARN ";
      console.log(`[${prefix}] ${issue.career} (${issue.lang}): ${issue.issue}`);
    }
    console.log();
  }

  // Summary
  console.log("Summary:");
  console.log("-".repeat(50));
  console.log(`  Careers validated : ${report.totalCareers}`);
  console.log(`  Files expected    : ${report.totalFiles}`);
  console.log(`  Errors            : ${report.errors}`);
  console.log(`  Warnings          : ${report.warnings}`);
  console.log(`  Result            : ${report.passed ? "PASS" : "FAIL"}`);

  if (!report.passed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
