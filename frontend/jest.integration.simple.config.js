// Simple Jest configuration for integration tests without Next.js wrapper
module.exports = {
  displayName: "Integration Tests",
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/tests/integration/**/*.test.ts",
    "<rootDir>/tests/integration/**/*.test.tsx",
  ],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
            tsx: true,
            decorators: true,
          },
          transform: {
            react: {
              runtime: "automatic",
            },
          },
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@/types/(.*)$": "<rootDir>/src/types/$1",
    "^@/lib/(.*)$": "<rootDir>/src/lib/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/tests/integration/setup/jest.setup.ts"],
  testTimeout: 30000,
  maxWorkers: 1,
  verbose: true,
  bail: false,
};
