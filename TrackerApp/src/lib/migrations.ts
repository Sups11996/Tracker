import * as SQLite from 'expo-sqlite';

/**
 * Run database migrations for existing users.
 */
export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check if migrations table exists
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // No active migrations at this time

  } catch (error) {
    console.error('[Migrations] Failed to run migrations:', error);
    throw error;
  }
}

/**
 * Helper function to run a single migration
 */
async function runMigration(
  db: SQLite.SQLiteDatabase,
  name: string,
  migration: () => Promise<void>
): Promise<void> {
  // Check if migration already applied
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM migrations WHERE name = ?`,
    [name]
  );

  if (result && result.count > 0) {
    return;
  }

  // Run the migration
  await migration();

  // Record migration as applied
  await db.runAsync(
    `INSERT INTO migrations (name) VALUES (?)`,
    [name]
  );
}
