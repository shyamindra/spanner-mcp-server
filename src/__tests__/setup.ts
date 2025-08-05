// Test setup file for Jest
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock environment variables for testing
process.env.GOOGLE_CLOUD_PROJECT_ID = 'test-project';
process.env.SPANNER_INSTANCE_ID = 'test-instance';
process.env.SPANNER_DATABASE_ID = 'test-database';
process.env.OPENAI_API_KEY = 'test-key';

// Global test timeout
jest.setTimeout(30000);

// Suppress console logs during tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
}); 