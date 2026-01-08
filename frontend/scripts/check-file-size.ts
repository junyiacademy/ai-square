#!/usr/bin/env tsx

/**
 * File Size & Quality Checker
 *
 * NEW PHILOSOPHY: Focus on modularity, AI-readability, and token efficiency - NOT just line counts.
 *
 * Checks:
 * 1. Cognitive complexity (cyclomatic complexity)
 * 2. Single Responsibility (number of exports, imports)
 * 3. Cohesion (related functions vs unrelated)
 * 4. Line count (soft limits, not hard enforcement)
 *
 * See: docs/standards/file-size-standards.md
 *
 * Usage:
 *   npm run check:file-size           # Check all files with new metrics
 *   npm run check:file-size -- --fix  # Show refactoring suggestions
 *   npm run check:file-size -- --ci   # Exit with error code if critical violations found
 *   npm run check:file-size -- --verbose  # Show detailed metrics for all files
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, extname, basename } from "path";

// Soft limits - trigger review, not automatic enforcement
const FILE_SIZE_SOFT_LIMITS: Record<string, number> = {
  component: 300, // React components (.tsx in components/)
  page: 400, // Next.js pages
  api: 300, // API routes
  service: 500, // Service layer
  repository: 400, // Repository pattern
  utility: 200, // Utility functions
  test: 800, // Test files (increased - tests can be larger with good organization)
  config: 1500, // Configuration files (increased - often necessarily large)
  default: 500, // Default limit
};

// Hard enforcement criteria - file must meet ALL to be blocked
interface EnforcementCriteria {
  size: boolean; // Exceeds 2x soft limit
  complexity: boolean; // High cyclomatic complexity
  multipleResponsibilities: boolean; // Multiple export types or concerns
}

// Severity levels
enum Severity {
  INFO = "INFO", // For information only, no action needed
  WARNING = "WARNING", // Exceeds soft limit, review recommended
  ERROR = "ERROR", // Meets enforcement criteria (blocking)
}

interface FileMetrics {
  lines: number;
  complexity: number; // Cyclomatic complexity estimate
  exportCount: number; // Number of exports
  importCount: number; // Number of imports
  hasMultipleConcerns: boolean; // Detected mixed responsibilities
  hasClearSections: boolean; // Has section comments
  duplicationScore: number; // 0-1, higher = more duplication
}

interface FileViolation {
  file: string;
  lines: number;
  limit: number;
  severity: Severity;
  type: string;
  metrics: FileMetrics;
  enforcementCriteria?: EnforcementCriteria;
  suggestions: string[];
  isExempt: boolean;
  exemptionReason?: string;
}

const EXCLUDED_DIRS = [
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  "public",
  ".git",
];

const EXCLUDED_FILES = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];

// Files that are automatically exempt from enforcement
const EXEMPT_FILES = [
  "tailwind.config.ts",
  "next.config.ts",
  "jest.config.ts",
  "playwright.config.ts",
];

// Patterns that indicate file should be exempt
const EXEMPT_PATTERNS = [
  /\.config\.(ts|js)$/,
  /types\.(ts|tsx)$/, // Type definition files
  /\.d\.ts$/, // TypeScript declaration files
];

/**
 * Calculate cyclomatic complexity (simplified estimation)
 * Counts decision points: if, for, while, case, &&, ||, ?, catch
 */
function calculateComplexity(content: string): number {
  const decisionPoints = [
    /\bif\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bcase\s+/g,
    /&&/g,
    /\|\|/g,
    /\?/g,
    /\bcatch\s*\(/g,
  ];

  let complexity = 1; // Base complexity
  for (const pattern of decisionPoints) {
    const matches = content.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
}

/**
 * Count exports in file
 */
function countExports(content: string): number {
  const exportPatterns = [
    /export\s+(default\s+)?function/g,
    /export\s+(default\s+)?class/g,
    /export\s+(default\s+)?const/g,
    /export\s+(default\s+)?interface/g,
    /export\s+(default\s+)?type/g,
    /export\s+{/g,
  ];

  let count = 0;
  for (const pattern of exportPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }

  return count;
}

/**
 * Count imports in file
 */
function countImports(content: string): number {
  const importMatches = content.match(/^import\s+/gm);
  return importMatches ? importMatches.length : 0;
}

/**
 * Check if file has clear section comments
 */
function hasClearSections(content: string): boolean {
  const sectionPatterns = [
    /\/\*\*[\s\S]*?Section:/i,
    /\/\/\s*=+\s*$/m,
    /\/\*\s*=+\s*\*\//,
    /\/\/\s*[A-Z][a-z]+\s+(Functions|Components|Helpers|Utils|Types|Interfaces):/i,
  ];

  return sectionPatterns.some((pattern) => pattern.test(content));
}

/**
 * Detect if file has multiple concerns
 * Heuristic: Checks for mixing of different responsibility patterns
 */
function hasMultipleConcerns(content: string, filePath: string): boolean {
  const concernPatterns = {
    uiComponent: /(?:return\s*<|<\w+|jsx|tsx)/i,
    apiHandling:
      /(?:export\s+async\s+function\s+(?:GET|POST|PUT|DELETE|PATCH))/,
    businessLogic: /(?:service|business|domain)/i,
    dataAccess: /(?:repository|query|sql|SELECT|INSERT|UPDATE|DELETE)/i,
    validation: /(?:validator|validate|schema|zod)/i,
    utilities: /(?:utils|helpers|format|parse)/i,
  };

  const detectedConcerns: string[] = [];
  for (const [concern, pattern] of Object.entries(concernPatterns)) {
    if (pattern.test(content)) {
      detectedConcerns.push(concern);
    }
  }

  // If file has API handling + business logic, or UI + data access, etc.
  const problematicCombinations = [
    ["apiHandling", "dataAccess"], // API routes should delegate to repositories
    ["uiComponent", "dataAccess"], // Components should not directly access data
    ["apiHandling", "businessLogic"], // API routes should delegate to services
  ];

  return problematicCombinations.some(
    ([concern1, concern2]) =>
      detectedConcerns.includes(concern1) &&
      detectedConcerns.includes(concern2),
  );
}

/**
 * Estimate code duplication (simplified)
 * Looks for repeated code blocks
 */
function calculateDuplicationScore(content: string): number {
  const lines = content.split("\n").filter((line) => line.trim().length > 20);
  const uniqueLines = new Set(lines);

  if (lines.length === 0) return 0;

  const duplicationRatio = 1 - uniqueLines.size / lines.length;
  return Math.min(Math.max(duplicationRatio, 0), 1);
}

/**
 * Check if file is exempt from enforcement
 */
function isFileExempt(
  filePath: string,
  content: string,
): { isExempt: boolean; reason?: string } {
  const fileName = basename(filePath);

  // Check explicit exempt files
  if (EXEMPT_FILES.includes(fileName)) {
    return { isExempt: true, reason: "Configuration file" };
  }

  // Check exempt patterns
  for (const pattern of EXEMPT_PATTERNS) {
    if (pattern.test(fileName)) {
      return {
        isExempt: true,
        reason: "Type definition or configuration file",
      };
    }
  }

  // Check for exemption documentation in file
  const exemptionMatch = content.match(
    /FILE SIZE EXEMPTION[\s\S]*?Justification:([\s\S]*?)(?:\*\/|Reviewed:)/i,
  );
  if (exemptionMatch) {
    return {
      isExempt: true,
      reason: exemptionMatch[1].trim().substring(0, 100),
    };
  }

  return { isExempt: false };
}

/**
 * Calculate comprehensive file metrics
 */
function analyzeFileMetrics(
  filePath: string,
  content: string,
  lineCount: number,
): FileMetrics {
  return {
    lines: lineCount,
    complexity: calculateComplexity(content),
    exportCount: countExports(content),
    importCount: countImports(content),
    hasMultipleConcerns: hasMultipleConcerns(content, filePath),
    hasClearSections: hasClearSections(content),
    duplicationScore: calculateDuplicationScore(content),
  };
}

/**
 * Determine file type based on path and naming conventions
 */
function getFileType(filePath: string): string {
  const fileName = basename(filePath);
  const dir = relative(process.cwd(), filePath);

  // Test files
  if (fileName.includes(".test.") || fileName.includes(".spec.")) {
    return "test";
  }

  // Configuration files
  if (
    fileName.endsWith(".config.ts") ||
    fileName.endsWith(".config.js") ||
    fileName === "tailwind.config.ts" ||
    fileName === "next.config.ts"
  ) {
    return "config";
  }

  // Components
  if (dir.includes("components/") && fileName.endsWith(".tsx")) {
    return "component";
  }

  // Pages
  if (
    dir.includes("app/") &&
    (fileName === "page.tsx" || fileName === "layout.tsx")
  ) {
    return "page";
  }

  // API routes
  if (dir.includes("app/") && fileName === "route.ts") {
    return "api";
  }

  // Services
  if (dir.includes("services/") || dir.includes("lib/services/")) {
    return "service";
  }

  // Repositories
  if (dir.includes("repositories/") || dir.includes("lib/repositories/")) {
    return "repository";
  }

  // Utilities
  if (dir.includes("utils/") || dir.includes("lib/utils/")) {
    return "utility";
  }

  return "default";
}

/**
 * Count lines in a file (excluding empty lines and comments) and return content
 */
function analyzeFile(filePath: string): { lines: number; content: string } {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    // Count non-empty, non-comment lines
    let count = 0;
    let inBlockComment = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) continue;

      // Handle block comments
      if (trimmed.startsWith("/*")) {
        inBlockComment = true;
      }
      if (inBlockComment) {
        if (trimmed.endsWith("*/")) {
          inBlockComment = false;
        }
        continue;
      }

      // Skip single-line comments
      if (trimmed.startsWith("//")) continue;

      count++;
    }

    return { lines: count, content };
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return { lines: 0, content: "" };
  }
}

/**
 * Generate refactoring suggestions based on file type and metrics
 */
function generateSuggestions(
  filePath: string,
  type: string,
  metrics: FileMetrics,
): string[] {
  const suggestions: string[] = [];

  // Complexity-based suggestions
  if (metrics.complexity > 50) {
    suggestions.push(
      `HIGH COMPLEXITY (${metrics.complexity}): Break down complex logic into smaller functions`,
    );
    suggestions.push("Consider using early returns to reduce nesting");
  }

  // Multiple concerns suggestions
  if (metrics.hasMultipleConcerns) {
    suggestions.push(
      "MIXED CONCERNS: Separate different responsibilities into focused files",
    );
    suggestions.push(
      "Follow Single Responsibility Principle - one file, one purpose",
    );
  }

  // Duplication suggestions
  if (metrics.duplicationScore > 0.3) {
    suggestions.push(
      `CODE DUPLICATION (${(metrics.duplicationScore * 100).toFixed(0)}%): Extract repeated patterns into utilities`,
    );
    suggestions.push("Apply DRY principle to reduce redundancy");
  }

  // Structure suggestions
  if (!metrics.hasClearSections && metrics.lines > 200) {
    suggestions.push(
      "Add section comments to improve navigation (e.g., // === Helper Functions ===)",
    );
    suggestions.push("Group related functions together");
  }

  // Type-specific suggestions
  switch (type) {
    case "component":
      if (metrics.exportCount > 5) {
        suggestions.push(
          "Too many exports - extract child components into separate files",
        );
      }
      suggestions.push("Move utility functions to a separate utils file");
      suggestions.push("Extract custom hooks if there is complex state logic");
      break;

    case "page":
      suggestions.push("Move business logic to service layer");
      suggestions.push("Extract data fetching to server components");
      if (metrics.lines > 300) {
        suggestions.push("Create smaller layout components");
      }
      break;

    case "api":
      if (metrics.hasMultipleConcerns) {
        suggestions.push("CRITICAL: Delegate business logic to service layer");
        suggestions.push(
          "CRITICAL: Use Repository Pattern for database access",
        );
      }
      suggestions.push("Extract validation to separate validator functions");
      break;

    case "service":
      if (metrics.lines > 600) {
        suggestions.push(
          "Split into multiple focused services by feature/domain",
        );
      }
      suggestions.push("Extract helper functions to utility files");
      break;

    case "repository":
      suggestions.push("Split into multiple repositories by domain if needed");
      suggestions.push("Extract query builders to separate files");
      break;

    case "test":
      if (metrics.lines > 1000) {
        suggestions.push(
          "Consider splitting test file by feature or test suite",
        );
      }
      suggestions.push("Use describe blocks to organize related tests");
      break;

    default:
      suggestions.push(
        "Consider splitting into multiple smaller files by concern",
      );
      suggestions.push("Extract reusable functions to utility files");
  }

  return suggestions;
}

/**
 * Determine enforcement severity based on new criteria
 */
function determineSeverity(
  metrics: FileMetrics,
  limit: number,
  isExempt: boolean,
): { severity: Severity; enforcementCriteria?: EnforcementCriteria } {
  if (isExempt) {
    return { severity: Severity.INFO };
  }

  // Check enforcement criteria
  const criteria: EnforcementCriteria = {
    size: metrics.lines > limit * 2,
    complexity: metrics.complexity > 50,
    multipleResponsibilities:
      metrics.hasMultipleConcerns || metrics.exportCount > 10,
  };

  // Only ERROR if meets ALL enforcement criteria
  if (
    criteria.size &&
    criteria.complexity &&
    criteria.multipleResponsibilities
  ) {
    return { severity: Severity.ERROR, enforcementCriteria: criteria };
  }

  // WARNING if exceeds soft limit
  if (metrics.lines > limit) {
    return { severity: Severity.WARNING };
  }

  return { severity: Severity.INFO };
}

/**
 * Recursively scan directory for violations
 */
function scanDirectory(
  dir: string,
  violations: FileViolation[] = [],
): FileViolation[] {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    // Skip excluded directories
    if (stat.isDirectory()) {
      if (EXCLUDED_DIRS.includes(entry)) continue;
      scanDirectory(fullPath, violations);
      continue;
    }

    // Skip excluded files
    if (EXCLUDED_FILES.includes(entry)) continue;

    // Only check TypeScript/JavaScript files
    const ext = extname(entry);
    if (![".ts", ".tsx", ".js", ".jsx"].includes(ext)) continue;

    // Analyze file
    const { lines, content } = analyzeFile(fullPath);
    const type = getFileType(fullPath);
    const limit = FILE_SIZE_SOFT_LIMITS[type];
    const metrics = analyzeFileMetrics(fullPath, content, lines);
    const { isExempt, reason: exemptionReason } = isFileExempt(
      fullPath,
      content,
    );
    const { severity, enforcementCriteria } = determineSeverity(
      metrics,
      limit,
      isExempt,
    );

    // Report if exceeds soft limit OR has quality issues
    if (
      lines > limit ||
      metrics.hasMultipleConcerns ||
      metrics.complexity > 50
    ) {
      const relativePath = relative(process.cwd(), fullPath);

      violations.push({
        file: relativePath,
        lines,
        limit,
        severity,
        type,
        metrics,
        enforcementCriteria,
        isExempt,
        exemptionReason,
        suggestions: generateSuggestions(fullPath, type, metrics),
      });
    }
  }

  return violations;
}

/**
 * Format violation output with new metrics
 */
function formatViolations(
  violations: FileViolation[],
  showSuggestions: boolean,
  verboseMode: boolean,
): string {
  if (violations.length === 0) {
    return "✅ All files pass quality checks!";
  }

  const errors = violations.filter((v) => v.severity === Severity.ERROR);
  const warnings = violations.filter((v) => v.severity === Severity.WARNING);
  const info = violations.filter((v) => v.severity === Severity.INFO);

  let output = "";

  if (errors.length > 0) {
    output += `\n❌ CRITICAL ISSUES (${errors.length} files - BLOCKING):\n`;
    output +=
      "   Files meet ALL enforcement criteria: 2x size + high complexity + multiple concerns\n\n";
    errors.forEach((v) => {
      output += `  ${v.file}\n`;
      output += `    Lines: ${v.lines} / Soft Limit: ${v.limit} (${v.type})\n`;
      output += `    Complexity: ${v.metrics.complexity} (threshold: 50)\n`;
      output += `    Exports: ${v.metrics.exportCount} | Imports: ${v.metrics.importCount}\n`;
      if (v.metrics.hasMultipleConcerns) {
        output += `    ⚠️  MIXED CONCERNS detected\n`;
      }
      if (v.metrics.duplicationScore > 0.3) {
        output += `    ⚠️  CODE DUPLICATION: ${(v.metrics.duplicationScore * 100).toFixed(0)}%\n`;
      }

      if (showSuggestions && v.suggestions.length > 0) {
        output += `    Refactoring Required:\n`;
        v.suggestions.forEach((s) => (output += `      • ${s}\n`));
      }
      output += "\n";
    });
  }

  if (warnings.length > 0) {
    output += `\n⚠️  WARNINGS (${warnings.length} files - review recommended):\n`;
    output +=
      "   Files exceed soft limits but may be justified if well-structured\n\n";
    warnings.forEach((v) => {
      output += `  ${v.file}\n`;
      output += `    Lines: ${v.lines} / Soft Limit: ${v.limit} (${v.type})\n`;

      if (verboseMode || v.isExempt) {
        output += `    Complexity: ${v.metrics.complexity}\n`;
        output += `    Exports: ${v.metrics.exportCount} | Imports: ${v.metrics.importCount}\n`;
        if (v.metrics.hasClearSections) {
          output += `    ✅ Has clear sections\n`;
        }
        if (v.metrics.hasMultipleConcerns) {
          output += `    ⚠️  Mixed concerns detected\n`;
        }
      }

      if (v.isExempt) {
        output += `    ℹ️  EXEMPT: ${v.exemptionReason}\n`;
      }

      if (showSuggestions && !v.isExempt && v.suggestions.length > 0) {
        output += `    Suggestions:\n`;
        v.suggestions.slice(0, 3).forEach((s) => (output += `      • ${s}\n`));
      }
      output += "\n";
    });
  }

  if (verboseMode && info.length > 0) {
    output += `\nℹ️  INFO (${info.length} files - no action needed):\n`;
    output += "   Files with quality metrics for reference\n\n";
    info.forEach((v) => {
      output += `  ${v.file}\n`;
      output += `    Lines: ${v.lines} | Complexity: ${v.metrics.complexity}\n`;
      output += `    Exports: ${v.metrics.exportCount} | Imports: ${v.metrics.importCount}\n`;
      if (v.isExempt) {
        output += `    EXEMPT: ${v.exemptionReason}\n`;
      }
      output += "\n";
    });
  }

  return output;
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const showSuggestions = args.includes("--fix") || args.includes("--suggest");
  const ciMode = args.includes("--ci");
  const verboseMode = args.includes("--verbose") || args.includes("-v");

  console.log("🔍 Analyzing file quality metrics...\n");
  console.log("📏 New Philosophy: Modularity > Line Counts\n");
  console.log(
    "   Checking: Complexity, Cohesion, AI-Readability, Token Efficiency\n",
  );
  console.log("   See: docs/standards/file-size-standards.md\n");

  const srcDir = join(process.cwd(), "src");
  const violations = scanDirectory(srcDir);

  console.log(formatViolations(violations, showSuggestions, verboseMode));

  // Summary with new metrics
  const errors = violations.filter((v) => v.severity === Severity.ERROR);
  const warnings = violations.filter((v) => v.severity === Severity.WARNING);
  const info = violations.filter((v) => v.severity === Severity.INFO);
  const exempt = violations.filter((v) => v.isExempt);

  if (violations.length > 0) {
    console.log("\n📊 Summary:");
    console.log(`  Critical Issues (blocking): ${errors.length}`);
    console.log(`  Warnings (review): ${warnings.length}`);
    console.log(`  Info (reference): ${info.length}`);
    console.log(`  Exempt Files: ${exempt.length}`);

    if (errors.length > 0) {
      console.log("\n🚨 Critical files must be refactored:");
      errors.forEach((e) => {
        console.log(`  • ${e.file}`);
        console.log(
          `    Criteria: ${e.lines} lines (2x limit: ${e.limit * 2}), ` +
            `complexity: ${e.metrics.complexity}, ` +
            `${e.metrics.hasMultipleConcerns ? "mixed concerns" : "ok"}`,
        );
      });
    }

    console.log("\n💡 Flags:");
    console.log("  --fix       Show refactoring suggestions");
    console.log("  --verbose   Show detailed metrics for all files");
    console.log("  --ci        Exit with error code if critical issues found");

    if (!showSuggestions && (errors.length > 0 || warnings.length > 0)) {
      console.log("\n📖 Run with --fix to see refactoring suggestions");
    }
  } else {
    console.log(
      "\n✨ All files pass quality metrics! Great job maintaining modularity.",
    );
  }

  // Exit with error code in CI mode if there are critical errors
  if (ciMode && errors.length > 0) {
    console.log(
      "\n❌ CI Mode: Exiting with error due to critical quality issues",
    );
    process.exit(1);
  }
}

main();
