/**
 * Lightweight in-memory mock for expo-sqlite.
 * Stores inserted rows in JS Maps so store functions can be tested
 * without a real SQLite engine.
 */

export function makeDb() {
  const tables: Record<string, any[]> = {};

  function getTable(name: string): any[] {
    if (!tables[name]) tables[name] = [];
    return tables[name];
  }

  const db = {
    // Reset all tables between tests
    _reset() {
      Object.keys(tables).forEach(k => delete tables[k]);
    },

    async runAsync(sql: string, params: any[] = []): Promise<{ lastInsertRowId: number }> {
      const s = sql.trim().toUpperCase();

      // INSERT INTO <table>
      const insertMatch = sql.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)/i);
      if (insertMatch) {
        const rows = getTable(insertMatch[1]);
        const id = rows.length + 1;
        rows.push({ _id: id, _params: params });
        return { lastInsertRowId: id };
      }

      // UPDATE / DELETE / other — no-op
      return { lastInsertRowId: 0 };
    },

    async getFirstAsync<T>(sql: string, params: any[] = []): Promise<T | null> {
      // SELECT value FROM kv_store WHERE key = ?
      const kvMatch = sql.match(/FROM\s+kv_store/i);
      if (kvMatch) return null; // no kv rows by default

      // SELECT * FROM user_profile
      const profileMatch = sql.match(/FROM\s+user_profile/i);
      if (profileMatch) return null;

      // SELECT * FROM step_tracking_state
      const stepMatch = sql.match(/FROM\s+step_tracking_state/i);
      if (stepMatch) return null;

      // SELECT SUM / aggregate — return 0
      const sumMatch = sql.match(/SUM\(/i);
      if (sumMatch) return { total: 0 } as unknown as T;

      return null;
    },

    async getAllAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
      const tableMatch = sql.match(/FROM\s+(\w+)/i);
      if (tableMatch) return getTable(tableMatch[1]) as unknown as T[];
      return [];
    },

    async execAsync(sql: string): Promise<void> {},
  };

  return db;
}

// Default export matches how stores import it
export default { makeDb };
