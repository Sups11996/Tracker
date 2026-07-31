import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';

interface AbcEntry {
  id: number;
  date: string;
  logged_at: number;
}

interface UndoEntry {
  logId: number;
  previousCount: number;
}

interface AbcState {
  todayCount: number;
  lastLoggedAt: number | null;
  yesterdayCount: number;
  entries: AbcEntry[];
  undoEntry: UndoEntry | null;
  undoTimer: ReturnType<typeof setTimeout> | null;
  setTodayCount: (count: number) => void;
  setLastLoggedAt: (time: number | null) => void;
  setYesterdayCount: (count: number) => void;
  setEntries: (entries: AbcEntry[]) => void;
  setUndoEntry: (entry: UndoEntry | null) => void;
  setUndoTimer: (timer: ReturnType<typeof setTimeout> | null) => void;
}

export const useAbcStore = create<AbcState>((set) => ({
  todayCount: 0,
  lastLoggedAt: null,
  yesterdayCount: 0,
  entries: [],
  undoEntry: null,
  undoTimer: null,
  setTodayCount: (count) => set({ todayCount: count }),
  setLastLoggedAt: (time) => set({ lastLoggedAt: time }),
  setYesterdayCount: (count) => set({ yesterdayCount: count }),
  setEntries: (entries) => set({ entries }),
  setUndoEntry: (entry) => set({ undoEntry: entry }),
  setUndoTimer: (timer) => set({ undoTimer: timer }),
}));

/**
 * Hydrate ABC store from SQLite.
 */
export async function hydrateAbcStore(db: SQLiteDatabase): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Today's entries
    const todayEntries = await db.getAllAsync<AbcEntry>(
      'SELECT id, date, logged_at FROM abc_logs WHERE date = ? ORDER BY logged_at ASC',
      [today]
    );

    const todayCount = todayEntries.length;
    const lastLoggedAt = todayCount > 0 ? todayEntries[todayEntries.length - 1].logged_at : null;

    // Yesterday's count
    const yesterdayRow = await db.getFirstAsync<{ count: number }>(
      'SELECT count FROM abc_daily_summary WHERE date = ?',
      [yesterday]
    );
    const yesterdayCount = yesterdayRow?.count ?? 0;

    useAbcStore.setState({
      todayCount,
      lastLoggedAt,
      yesterdayCount,
      entries: todayEntries,
    });
  } catch (error) {
    console.error('Failed to hydrate ABC store:', error);
  }
}

/**
 * Log a new ABC entry (increment count).
 */
export async function logAbc(db: SQLiteDatabase): Promise<void> {
  const now = Date.now();
  const today = new Date(now).toISOString().split('T')[0];
  const state = useAbcStore.getState();
  const newCount = state.todayCount + 1;

  try {
    const result = await db.runAsync(
      'INSERT INTO abc_logs (date, logged_at, created_at) VALUES (?, ?, ?)',
      [today, now, now]
    );

    const newEntry: AbcEntry = {
      id: result.lastInsertRowId,
      date: today,
      logged_at: now,
    };

    // Clear existing undo timer
    const { undoTimer } = state;
    if (undoTimer) clearTimeout(undoTimer);

    // Set undo entry — expires after 5 seconds
    const timer = setTimeout(() => {
      useAbcStore.getState().setUndoEntry(null);
      useAbcStore.getState().setUndoTimer(null);
    }, 5000);

    useAbcStore.setState({
      todayCount: newCount,
      lastLoggedAt: now,
      entries: [...state.entries, newEntry],
      undoEntry: {
        logId: result.lastInsertRowId,
        previousCount: state.todayCount,
      },
      undoTimer: timer,
    });

    // Update daily summary
    await db.runAsync(
      `INSERT INTO abc_daily_summary (date, count, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET count = ?, updated_at = ?`,
      [today, newCount, now, now, newCount, now]
    );
  } catch (error) {
    console.error('Failed to log ABC:', error);
    throw error;
  }
}

/**
 * Undo the last ABC log entry within the 5-second window.
 */
export async function undoLastAbc(db: SQLiteDatabase): Promise<void> {
  const state = useAbcStore.getState();
  const { undoEntry, undoTimer } = state;
  if (!undoEntry) return;

  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();

  try {
    await db.runAsync('DELETE FROM abc_logs WHERE id = ?', [undoEntry.logId]);

    if (undoTimer) clearTimeout(undoTimer);

    const newEntries = state.entries.filter((e) => e.id !== undoEntry.logId);
    const newLastLoggedAt = newEntries.length > 0
      ? newEntries[newEntries.length - 1].logged_at
      : null;

    useAbcStore.setState({
      todayCount: undoEntry.previousCount,
      lastLoggedAt: newLastLoggedAt,
      entries: newEntries,
      undoEntry: null,
      undoTimer: null,
    });

    // Update daily summary
    if (undoEntry.previousCount === 0) {
      await db.runAsync('DELETE FROM abc_daily_summary WHERE date = ?', [today]);
    } else {
      await db.runAsync(
        'UPDATE abc_daily_summary SET count = ?, updated_at = ? WHERE date = ?',
        [undoEntry.previousCount, now, today]
      );
    }
  } catch (error) {
    console.error('Failed to undo ABC:', error);
    throw error;
  }
}
