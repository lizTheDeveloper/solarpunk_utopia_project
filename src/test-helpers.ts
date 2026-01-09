/**
 * Test helpers for setting up test environment
 */

import { db } from './core/database';

/**
 * Reset the global database instance for testing
 * Call this in beforeEach to ensure test isolation
 */
export async function resetDatabase() {
  // Close existing connection if any
  await db.close();

  // Reinitialize with fresh state
  await db.init();
}

/**
 * Clean up database after tests
 */
export async function cleanupDatabase() {
  await db.close();
}
