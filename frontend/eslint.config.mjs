import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      // Tests
      "**/__tests__/**",
      "**/*.test.*",
      "**/*.spec.*",
      // Build and coverage artifacts
      ".next/**",
      "coverage/**",
      // Markdown docs
      "**/*.md",
      // Public assets
      "public/**",
      // Generated reports
      "coverage-lcov/**",
      // Scripts directory (ignore all file types)
      "scripts/**",
      // Root-level helper scripts
      "setup-admin.js",
    ],
  },
  {
    rules: {
      // Downgrade some rules to warnings to allow build
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "prefer-const": "warn",
      "react/jsx-no-undef": "error", // Keep this as error
      "react/no-unescaped-entities": "warn", // Allow unescaped entities
    },
  },
  // Allow CommonJS require in config and tooling files
  {
    files: [
      "next.config.*",
      "jest*.config.*",
      "playwright.config.*",
      "scripts/**/*.*",
      "tests/integration/**/*.*",
      "**/test-assessment-staging*.js",
      "test-with-cookies.js",
      "setup-admin.js",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
    },
  },
  // Special rules for test-utils directory
  {
    files: ["src/test-utils/**/*.ts", "src/test-utils/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
  },
];

export default eslintConfig;
