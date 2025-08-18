/**
 * Vitest Test Setup
 * 
 * Global test configuration and mocks
 */

import { vi } from 'vitest';

// Mock environment variables for testing
process.env['JWT_SECRET'] = 'test-jwt-secret-key-for-testing';
process.env['JWT_EXPIRES_IN'] = '15m';
process.env['REFRESH_TOKEN_EXPIRES_IN'] = '7d';
process.env['BCRYPT_ROUNDS'] = '4'; // Lower rounds for faster tests

// Mock database connection
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn()
  }
}));

// Global test helpers
global.console = {
  ...console,
  // Uncomment to suppress console logs during tests
  // log: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};