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
process.env['NODE_ENV'] = 'test';

// Mock bcrypt globally
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn()
  },
  hash: vi.fn(),
  compare: vi.fn()
}));

// Mock jsonwebtoken globally
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn()
  },
  sign: vi.fn(),
  verify: vi.fn()
}));

// Create comprehensive mock database for use across tests
const createMockChain = () => ({
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  orderBy: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
  onConflictDoNothing: vi.fn().mockReturnThis()
});

const mockDatabaseInstance = {
  select: vi.fn(() => createMockChain()),
  insert: vi.fn(() => createMockChain()),
  update: vi.fn(() => createMockChain()),
  delete: vi.fn(() => createMockChain()),
  transaction: vi.fn(),
  execute: vi.fn().mockResolvedValue([])
};

// Mock database connection
vi.mock('../db/index.js', () => ({
  db: mockDatabaseInstance
}));

// Mock database connection.js
vi.mock('../db/connection.js', () => ({
  db: mockDatabaseInstance,
  database: mockDatabaseInstance,
  checkDatabaseHealth: vi.fn(),
  closeDatabaseConnection: vi.fn(),
  getDatabaseStats: vi.fn(),
  withTransaction: vi.fn(),
  sql: vi.fn()
}));

// Export mock for use in other test files
export { mockDatabaseInstance as mockDb };

// Global test helpers
global.console = {
  ...console,
  // Uncomment to suppress console logs during tests
  // log: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};