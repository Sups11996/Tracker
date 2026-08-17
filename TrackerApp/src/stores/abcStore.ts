import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getTodayLocal, getYesterdayLocal } from '../lib/dateUtils';

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
  dailyGoal: number;
  undoStack: UndoEntry[];
  undoEntry: UndoEntry | null;
  undoTimer: ReturnType<typeof setTimeout> | null;
  setTodayCount: (count: number) => void;
  setLastLoggedAt: (time: number | null) => void;
  setYesterdayCount: (count: number) => void;
  setEntries: (entries: AbcEntry[]) => void;
  setDailyGoal: (goal: number) => void;
  setUndoEntry: (entry: UndoEntry | null) => void;
  setUndoTimer: (timer: ReturnType<typeof setTimeout> | null) => void;
}

export const useAbcStore = create<AbcState>((set) => ({
  todayCount: 0,
  lastLoggedAt: null,
  yesterdayCount: 0,
  entries: [],
  dailyGoal: 3,
  undoStack: [],
  undoEntry: null,
  undoTimer: null,
  setTodayCount: (count) => set({ todayCount: count }),
  setLastLoggedAt: (time) => set({ lastLoggedAt: time }),
  setYesterdayCount: (count) => set({ yesterdayCount: count }),
  setEntries: (entries) => set({ entries }),
  setDailyGoal: (goal) => set({ dailyGoal: goal }),
  setUndoEntry: (entry) => set({ undoEntry: entry }),
  setUndoTimer: (timer) => set({ undoTimer: timer }),
}));

/**
 * Hydrate ABC store from SQLite.
 */
export async function hydrateAbcStore(db: SQLiteDatabase): Promise<void> {
  try {
    const today = getTodayLocal();
    const yesterday = getYesterdayLocal();

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

    // Daily goal
    const goalRow = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM kv_store WHERE key = 'abc_daily_goal'`
    );
    const dailyGoal = goalRow ? parseInt(goalRow.value, 10) : 3;

    useAbcStore.setState({
      todayCount,
      lastLoggedAt,
      yesterdayCount,
      entries: todayEntries,
      dailyGoal,
      undoStack: [],
      undoEntry: null,
    });
  } catch (error) {
    console.error('[AbcStore] Hydration failed:', error);
    // Set safe defaults
    useAbcStore.setState({
      todayCount: 0,
      lastLoggedAt: null,
      yesterdayCount: 0,
      entries: [],
      dailyGoal: 3,
      undoStack: [],
      undoEntry: null,
      undoTimer: null,
    });
  }
}

/**
 * Delete a specific ABC log entry by id (today only).
 */
export async function deleteAbcEntry(
  db: SQLiteDatabase,
  logId: number
): Promise<void> {
  const today = getTodayLocal();
  const now = Date.now();
  const state = useAbcStore.getState();

  try {
    await db.runAsync('DELETE FROM abc_logs WHERE id = ?', [logId]);

    const newEntries = state.entries.filter(e => e.id !== logId);
    const newCount = newEntries.length;
    const newLastLoggedAt = newEntries.length > 0 ? newEntries[newEntries.length - 1].logged_at : null;

    // Update daily summary
    if (newCount === 0) {
      await db.runAsync('DELETE FROM abc_daily_summary WHERE date = ?', [today]);
    } else {
      await db.runAsync(
        'UPDATE abc_daily_summary SET count = ?, updated_at = ? WHERE date = ?',
        [newCount, now, today]
      );
    }

    // Filter undoStack to remove the deleted entry
    const newUndoStack = state.undoStack.filter(u => u.logId !== logId);
    const newUndoEntry = newUndoStack.length > 0 ? newUndoStack[newUndoStack.length - 1] : null;

    useAbcStore.setState({
      entries: newEntries,
      todayCount: newCount,
      lastLoggedAt: newLastLoggedAt,
      undoStack: newUndoStack,
      undoEntry: newUndoEntry,
    });
  } catch (error) {
    console.error('[AbcStore] Delete entry failed:', error);
    throw new Error('Failed to delete ABC entry');
  }
}

/**
 * Log a new ABC entry (increment count).
 */
export async function logAbc(db: SQLiteDatabase): Promise<void> {
  const now = Date.now();
  const today = getTodayLocal();
  const state = useAbcStore.getState();
  const newCount = state.todayCount + 1;

  try {
    const result = await db.runAsync(
      'INSERT INTO abc_logs (date, logged_at, created_at) VALUES (?, ?, ?)',
      [today, now, now]
    );

    // Update daily summary
    await db.runAsync(
      `INSERT INTO abc_daily_summary (date, count, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET count = ?, updated_at = ?`,
      [today, newCount, now, now, newCount, now]
    );

    // Both DB writes succeeded — now update the store
    const newEntry: AbcEntry = {
      id: result.lastInsertRowId,
      date: today,
      logged_at: now,
    };

    // Clear existing undo timer (reset the 5-second window)
    const { undoTimer, undoStack } = state;
    if (undoTimer) clearTimeout(undoTimer);

    // Push new undo entry onto stack
    const newUndoEntry: UndoEntry = {
      logId: result.lastInsertRowId,
      previousCount: state.todayCount,
    };
    const newStack = [...undoStack, newUndoEntry];

    // Timer clears the whole stack after 5 seconds of inactivity
    const timer = setTimeout(() => {
      useAbcStore.getState().setUndoEntry(null);
      useAbcStore.setState({ undoStack: [] });
      useAbcStore.getState().setUndoTimer(null);
    }, 5000);

    useAbcStore.setState({
      todayCount: newCount,
      lastLoggedAt: now,
      entries: [...state.entries, newEntry],
      undoStack: newStack,
      undoEntry: newUndoEntry,
      undoTimer: timer,
    });
  } catch (error) {
    console.error('[AbcStore] Log ABC failed:', error);
    throw new Error('Failed to log ABC entry');
  }
}

/**
 * Undo the last ABC log entry within the 5-second window.
 * Each call pops one entry from the stack, so rapid taps can each be undone.
 */
export async function undoLastAbc(db: SQLiteDatabase): Promise<void> {
  const state = useAbcStore.getState();
  const { undoStack, undoTimer } = state;
  if (undoStack.length === 0) return;

  // Pop the top (most recent) entry
  const topEntry = undoStack[undoStack.length - 1];
  const newStack = undoStack.slice(0, -1);

  const today = getTodayLocal();
  const now = Date.now();

  try {
    await db.runAsync('DELETE FROM abc_logs WHERE id = ?', [topEntry.logId]);

    const newEntries = state.entries.filter((e) => e.id !== topEntry.logId);
    const newLastLoggedAt = newEntries.length > 0
      ? newEntries[newEntries.length - 1].logged_at
      : null;

    // Update daily summary first — store only updated after both DB writes succeed
    if (topEntry.previousCount === 0) {
      await db.runAsync('DELETE FROM abc_daily_summary WHERE date = ?', [today]);
    } else {
      await db.runAsync(
        'UPDATE abc_daily_summary SET count = ?, updated_at = ? WHERE date = ?',
        [topEntry.previousCount, now, today]
      );
    }

    // Both DB writes succeeded — now update the store
    if (newStack.length > 0) {
      if (undoTimer) clearTimeout(undoTimer);
      const timer = setTimeout(() => {
        useAbcStore.getState().setUndoEntry(null);
        useAbcStore.setState({ undoStack: [] });
        useAbcStore.getState().setUndoTimer(null);
      }, 5000);

      useAbcStore.setState({
        todayCount: topEntry.previousCount,
        lastLoggedAt: newLastLoggedAt,
        entries: newEntries,
        undoStack: newStack,
        undoEntry: newStack[newStack.length - 1],
        undoTimer: timer,
      });
    } else {
      if (undoTimer) clearTimeout(undoTimer);
      useAbcStore.setState({
        todayCount: topEntry.previousCount,
        lastLoggedAt: newLastLoggedAt,
        entries: newEntries,
        undoStack: [],
        undoEntry: null,
        undoTimer: null,
      });
    }
  } catch (error) {
    console.error('[AbcStore] Undo ABC failed:', error);
    throw new Error('Failed to undo ABC entry');
  }
}
