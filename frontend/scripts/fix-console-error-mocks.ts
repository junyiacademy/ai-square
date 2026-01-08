#!/usr/bin/env node

/**
 * Script to fix console.error mocks in test files
 * Replaces jest.spyOn pattern with our centralized mock helper
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const files = [
  "src/app/api/scenarios/__tests__/index.test.ts",
  "src/app/api/monitoring/status/__tests__/route.test.ts",
  "src/app/api/discovery/translate/__tests__/route.test.ts",
  "src/app/api/learning/programs/__tests__/route.test.ts",
  "src/app/api/discovery/programs/[programId]/__tests__/route.test.ts",
  "src/app/api/discovery/scenarios/__tests__/route.test.ts",
  "src/app/api/assessment/results/[id]/__tests__/route.test.ts",
  "src/app/api/assessment/__tests__/route.test.ts",
  "src/app/api/admin/data/__tests__/route.test.ts",
  "src/app/api/auth/register/__tests__/route.test.ts",
  "src/app/api/assessment/programs/[programId]/answer/__tests__/route.test.ts",
  "src/app/api/chat/__tests__/route.test.ts",
  "src/app/api/assessment/scenarios/__tests__/route.test.ts",
  "src/app/api/users/update-progress/__tests__/route.test.ts",
  "src/app/api/chat/sessions/__tests__/route.test.ts",
  "src/app/api/chat/sessions/[sessionId]/__tests__/route.test.ts",
  "src/app/api/pbl/recommendations/__tests__/route.test.ts",
  "src/app/api/scenarios/index/__tests__/route.test.ts",
  "src/app/api/learning/progress/__tests__/route.test.ts",
  "src/app/api/monitoring/cache/__tests__/route.test.ts",
];

let fixedCount = 0;

files.forEach((file) => {
  const filePath = path.join(process.cwd(), file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, "utf-8");
  const originalContent = content;

  // Check if already using the new helper
  if (
    content.includes("import { mockConsoleError") &&
    content.includes("@/test-utils/helpers/console")
  ) {
    console.log(`✅ Already fixed: ${file}`);
    return;
  }

  // Replace the old pattern with new import
  if (
    content.includes(
      "const mockConsoleError = jest.spyOn(console, 'error').mockImplementation()",
    )
  ) {
    // Add import if not present
    if (
      !content.includes(
        "import { mockConsoleError as createMockConsoleError } from",
      )
    ) {
      // Find the last import statement
      const importMatch = content.match(/^import .* from .*/gm);
      if (importMatch) {
        const lastImport = importMatch[importMatch.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        content =
          content.slice(0, lastImportIndex + lastImport.length) +
          "\nimport { mockConsoleError as createMockConsoleError } from '@/test-utils/helpers/console';" +
          content.slice(lastImportIndex + lastImport.length);
      }
    }

    // Replace the mock creation
    content = content.replace(
      /const mockConsoleError = jest\.spyOn\(console, 'error'\)\.mockImplementation\(\);?/g,
      "const mockConsoleError = createMockConsoleError();",
    );

    // Write the updated content
    fs.writeFileSync(filePath, content);
    fixedCount++;
    console.log(`🔧 Fixed: ${file}`);
  } else {
    console.log(`⏭️  Skipped (different pattern): ${file}`);
  }
});

console.log(`\n✨ Fixed ${fixedCount} files`);

// Run TypeScript check on fixed files
console.log("\n🔍 Running TypeScript check...");
try {
  execSync("npm run typecheck", { stdio: "inherit" });
  console.log("✅ TypeScript check passed");
} catch (error) {
  console.error("❌ TypeScript check failed");
  process.exit(1);
}
