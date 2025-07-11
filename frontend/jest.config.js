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
      branches: 25,
      functions: 25,
      lines: 35,
      statements: 35,
    },
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jose|d3|d3-.*)/)',
  ],
  moduleNameMapper: {
    '^jose$': '<rootDir>/__mocks__/jose.js',
    '^next/server$': '<rootDir>/__mocks__/next/server.js',
    '^d3$': '<rootDir>/__mocks__/d3.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

module.exports = createJestConfig(customJestConfig)