#!/usr/bin/env node

/**
 * Script to systematically fix API test authentication patterns
 * Converts from custom cookie handling to standardized test helpers
 */

const fs = require("fs");
const path = require("path");
const { glob } = require("glob");

// Define the patterns for different authentication methods
const AUTH_PATTERNS = {
  // Routes that use cookie-based auth (most PBL/Assessment/Discovery routes)
  cookie: [
    "pbl/**/__tests__/route.test.ts",
    "assessment/**/__tests__/route.test.ts",
    "discovery/**/__tests__/route.test.ts",
    "learning/**/__tests__/route.test.ts",
  ],
  // Routes that use x-user-info header auth (chat routes)
  header: ["chat/**/__tests__/route.test.ts"],
};

const REQUIRED_IMPORTS = `import {
  createAuthenticatedRequestWithCookie,
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  setupAPITestEnvironment,
  cleanupAPITestEnvironment,
  AuthenticatedUser
} from '@/test-utils/helpers/api-test-helpers';`;

/**
 * Fix a single test file
 */
function fixTestFile(filePath, authMethod = "cookie") {
  console.log(`Fixing ${filePath} with ${authMethod} authentication...`);

  let content = fs.readFileSync(filePath, "utf8");

  // Skip if already using test helpers
  if (content.includes("api-test-helpers")) {
    console.log(`  → Skipping ${filePath} - already using test helpers`);
    return;
  }

  // Add imports after existing imports
  const importRegex = /(import.*from.*';?\n)/g;
  const importMatches = [...content.matchAll(importRegex)];
  if (importMatches.length > 0) {
    const lastImport = importMatches[importMatches.length - 1];
    const insertPos = lastImport.index + lastImport[0].length;
    content =
      content.slice(0, insertPos) +
      "\n" +
      REQUIRED_IMPORTS +
      "\n" +
      content.slice(insertPos);
  }

  // Add test setup/teardown
  const setupTeardown = `
  beforeAll(() => {
    setupAPITestEnvironment();
  });

  afterAll(() => {
    cleanupAPITestEnvironment();
  });
`;

  // Insert after the describe block starts
  content = content.replace(/(describe\([^{]+{)/, `$1${setupTeardown}`);

  // Remove custom createMockRequest functions
  content = content.replace(/const createMockRequest = [\s\S]*?};\s*/g, "");

  // Fix authentication test patterns based on auth method
  if (authMethod === "cookie") {
    // Replace authenticated requests
    content = content.replace(
      /createMockRequest\(\s*([^,]+),\s*{\s*user:\s*JSON\.stringify\(([^}]+})\)\s*}\s*\)/g,
      "createAuthenticatedRequestWithCookie(\n      'http://localhost$API_URL',\n      'POST',\n      $1,\n      $2\n    )",
    );

    // Replace unauthenticated requests
    content = content.replace(
      /createMockRequest\(\s*([^}]+})\s*\)/g,
      "createUnauthenticatedRequest(\n      'http://localhost$API_URL',\n      'POST',\n      $1\n    )",
    );
  } else {
    // For header-based auth, use createAuthenticatedRequest
    content = content.replace(
      /new NextRequest\([^,]+,\s*{\s*method:\s*['"](POST|GET|PUT|DELETE|PATCH)['"],[\s\S]*?}\)/g,
      "createAuthenticatedRequest(\n      'http://localhost$API_URL',\n      '$1',\n      body,\n      { email: 'test@example.com' }\n    )",
    );
  }

  // Try to infer API URL from file path
  const apiUrl = filePath
    .replace(/.*\/src\/app\/api/, "/api")
    .replace(/\/__tests__\/route\.test\.ts$/, "")
    .replace(/\[([^\]]+)\]/g, "test-$1");

  content = content.replace(/\$API_URL/g, apiUrl);

  // Fix cookie setting patterns for unauthenticated tests
  content = content.replace(
    /(request\.cookies\.set\(['"]user['"],\s*[^)]+\);)/g,
    "    $1",
  );

  fs.writeFileSync(filePath, content);
  console.log(`  ✓ Fixed ${filePath}`);
}

/**
 * Main execution
 */
async function main() {
  const srcPath = path.join(__dirname, "..", "src", "app", "api");

  console.log("🔧 Fixing API test authentication patterns...\n");

  // Fix cookie-based auth tests
  for (const pattern of AUTH_PATTERNS.cookie) {
    const files = await glob(path.join(srcPath, pattern));
    for (const file of files) {
      fixTestFile(file, "cookie");
    }
  }

  // Fix header-based auth tests
  for (const pattern of AUTH_PATTERNS.header) {
    const files = await glob(path.join(srcPath, pattern));
    for (const file of files) {
      fixTestFile(file, "header");
    }
  }

  console.log("\n✅ All API test files have been updated!");
  console.log("📝 Please review the changes and run tests to verify fixes.");
}

if (require.main === module) {
  main().catch(console.error);
}
