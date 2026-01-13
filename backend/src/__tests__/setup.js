// Jest setup file for backend integration tests

// Set test environment variables
process.env.NODE_ENV = "test";

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global afterAll to cleanup
afterAll(async () => {
  // Allow connections to close gracefully
  await new Promise((resolve) => setTimeout(resolve, 100));
});
