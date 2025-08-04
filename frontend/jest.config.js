const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/', '<rootDir>/e2e/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      // Phase 1: Current (too low)
      // branches: 25,
      // functions: 25,
      // lines: 35,
      // statements: 35,
      
      // Phase 2: Q1 2025 Target (提升到 40%)
      branches: 40,
      functions: 40,
      lines: 40,
      statements: 40,
      
      // Phase 3: Q2 2025 Target (提升到 60%)
      // branches: 60,
      // functions: 60,
      // lines: 60,
      // statements: 60,
      
      // Phase 4: Final Target (70%+)
      // branches: 70,
      // functions: 70,
      // lines: 70,
      // statements: 70,
    },
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jose|d3|d3-.*|react-markdown|remark.*|unified|unist-.*|mdast-.*|micromark.*|vfile.*|hast.*|comma-separated-tokens|property-information|space-separated-tokens|decode-named-character-reference|character-entities)/)',
  ],
  moduleNameMapper: {
    '^jose$': '<rootDir>/__mocks__/jose.js',
    '^next/server$': '<rootDir>/__mocks__/next/server.js',
    '^d3$': '<rootDir>/src/__mocks__/d3.ts',
    '^react-markdown$': '<rootDir>/__mocks__/react-markdown.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

module.exports = createJestConfig(customJestConfig)