module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.js"],
  moduleFileExtensions: ["js", "json"],
  collectCoverageFrom: ["src/**/*.js", "!src/__tests__/**"],
  coverageDirectory: "coverage",
  verbose: true,
};
