/**
 * Vitest Test Setup
 *
 * This file runs before each test file. Add global test configuration here.
 */

// Set test environment variables
process.env.JWT_SECRET = "test-jwt-secret-key-for-testing-only-32chars";
process.env.ENCRYPTION_KEY =
	"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// Mock console methods to reduce noise in tests (optional)
// Uncomment if you want to suppress console output during tests
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
// };
