import * as SQLite from 'expo-sqlite';

/**
 * Get today's date in YYYY-MM-DD format using local timezone.
 * Use this instead of new Date().toISOString().split('T')[0] which uses UTC.
 */
export function getTodayLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get yesterday's date in YYYY-MM-DD format using local timezone.
 */
export function getYesterdayLocal(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get date N days ago in YYYY-MM-DD format using local timezone.
 */
export function getDaysAgoLocal(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert a Date object to YYYY-MM-DD format using local timezone.
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a date string (YYYY-MM-DD) is today in local timezone.
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getTodayLocal();
}

/**
 * Check if a date string (YYYY-MM-DD) is yesterday in local timezone.
 */
export function isYesterday(dateStr: string): boolean {
  return dateStr === getYesterdayLocal();
}

/**
 * Store and check for date changes using SQLite database.
 * Returns true if the date has changed since last check.
 */
export async function checkDateChanged(db: SQLite.SQLiteDatabase): Promise<boolean> {
  try {
    const today = getTodayLocal();
    
    // Get last known date from database
    const row = await db.getFirstAsync(
      'SELECT value FROM kv_store WHERE key = ?',
      ['last_known_date']
    ) as { value: string } | null;
    
    if (!row) {
      // First launch - store current date and return false (no date change on first launch)
      await db.runAsync(
        'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
        ['last_known_date', today]
      );
      return false;
    }
    
    // Return true if date changed, but DON'T update it here
    // Caller is responsible for updating after successful data save
    return row.value !== today;
  } catch (error) {
    return false;
  }
}
