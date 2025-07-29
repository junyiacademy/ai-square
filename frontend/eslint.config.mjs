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
      "**/__tests__/**", 
      "**/*.test.*", 
      "**/*.spec.*",
      // Ignore script files with shebang
      "src/scripts/**/*.ts",
      "src/scripts/**/*.js"
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
