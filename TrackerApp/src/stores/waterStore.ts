import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getTodayLocal } from '../lib/dateUtils';

export interface WaterContainer {
  id: number;
  name: string;
  capacity_ml: number;
  sort_order: number;
}

interface WaterLog {
  id: number;
  logged_at: number;
  container_name: string;
  capacity_ml: number;
  running_total: number;
}

interface UndoEntry {
  logId: number;
  amount: number;
  previousTotal: number;
  timestamp: number;
}

interface WaterState {
  todayTotal: number;
  dailyGoal: number;
  containers: WaterContainer[];
  logs: WaterLog[];
  undoStack: UndoEntry[];
  undoTimer: ReturnType<typeof setTimeout> | null;
  setTodayTotal: (total: number) => void;
  setContainers: (containers: WaterContainer[]) => void;
  setLogs: (logs: WaterLog[]) => void;
  setUndoStack: (stack: UndoEntry[]) => void;
  setUndoTimer: (timer: ReturnType<typeof setTimeout> | null) => void;
}

export const useWaterStore = create<WaterState>((set) => ({
  todayTotal: 0,
  dailyGoal: 2400,
  containers: [],
  logs: [],
  undoStack: [],
  undoTimer: null,
  setTodayTotal: (total) => set({ todayTotal: total }),
  setContainers: (containers) => set({ containers }),
  setLogs: (logs) => set({ logs }),
  setUndoStack: (stack) => set({ undoStack: stack }),
  setUndoTimer: (timer) => set({ undoTimer: timer }),
}));

/**
 * Load containers, today's logs, daily goal from SQLite
 */
export async function hydrateWaterStore(db: SQLiteDatabase): Promise<void> {
  try {
    const today = getTodayLocal();

    // Load containers
    const containers = await db.getAllAsync<WaterContainer>(
      'SELECT id, name, capacity_ml, sort_order FROM water_containers WHERE is_deleted = 0 ORDER BY sort_order ASC'
    );

    // Load today's logs
    const logs = await db.getAllAsync<WaterLog>(
      'SELECT id, logged_at, container_name, capacity_ml, running_total FROM water_logs WHERE date = ? ORDER BY logged_at ASC',
      [today]
    );

    // Today's total = sum of capacity_ml (don't trust running_total — stale after deletions)
    const todayTotal = logs.reduce((sum, l) => sum + l.capacity_ml, 0);

    // Load daily goal — prefer kv_store (new path), fall back to user_profile for backwards compatibility
    const kvGoal = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM kv_store WHERE key = 'water_daily_goal'`
    );
    let waterGoal = 2400;
    if (kvGoal) {
      waterGoal = parseInt(kvGoal.value, 10);
    } else {
      const profile = await db.getFirstAsync<{ water_goal_ml: number }>(
        'SELECT water_goal_ml FROM user_profile WHERE id = 1'
      );
      waterGoal = profile?.water_goal_ml ?? 2400;
      // One-time migration: write to kv_store so it's the single source of truth going forward
      await db.runAsync(
        'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
        ['water_daily_goal', waterGoal.toString()]
      );
      // Clear user_profile back to default so it no longer diverges
      await db.runAsync(
        'UPDATE user_profile SET water_goal_ml = 2400 WHERE id = 1 AND water_goal_ml != 2400'
      );
    }

    useWaterStore.setState({
      containers,
      logs,
      todayTotal,
      dailyGoal: waterGoal,
    });
  } catch (error) {
    console.error('[WaterStore] Hydration failed:', error);
    // Set safe defaults on error - app continues to work
    useWaterStore.setState({
      containers: [],
      logs: [],
      todayTotal: 0,
      dailyGoal: 2400,
    });
  }
}

// Serialisation lock — ensures concurrent logWater calls queue up and each
// reads the committed total from the previous call, not a stale parallel snapshot.
let logWaterLock: Promise<void> = Promise.resolve();

/**
 * Log a water intake entry. Returns the new log id.
 */
export async function logWater(
  db: SQLiteDatabase,
  container: WaterContainer
): Promise<void> {
  // Queue behind any in-flight logWater call
  let resolveLock!: () => void;
  const previousLock = logWaterLock;
  logWaterLock = new Promise<void>(r => { resolveLock = r; });
  await previousLock;

  const now = Date.now();
  const today = getTodayLocal();
  // Re-read state AFTER acquiring lock so we get the committed total
  const state = useWaterStore.getState();
  const { dailyGoal } = state;
  const newTotal = state.todayTotal + container.capacity_ml;

  try {
    const result = await db.runAsync(
      `INSERT INTO water_logs (date, logged_at, container_id, container_name, capacity_ml, running_total, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [today, now, container.id, container.name, container.capacity_ml, newTotal, now]
    );

    // Update daily summary
    await db.runAsync(
      `INSERT INTO water_daily_summary (date, total_ml, goal_ml, goal_met, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET total_ml = ?, goal_met = ?, updated_at = ?`,
      [
        today, newTotal,
        dailyGoal,
        newTotal >= dailyGoal ? 1 : 0,
        now, now,
        newTotal,
        newTotal >= dailyGoal ? 1 : 0,
        now,
      ]
    );

    const newLog: WaterLog = {
      id: result.lastInsertRowId,
      logged_at: now,
      container_name: container.name,
      capacity_ml: container.capacity_ml,
      running_total: newTotal,
    };

    // Add to undo stack (keep last 10 entries)
    const newUndoEntry: UndoEntry = {
      logId: result.lastInsertRowId,
      amount: container.capacity_ml,
      previousTotal: state.todayTotal,
      timestamp: now,
    };

    const newStack = [...state.undoStack, newUndoEntry].slice(-10); // Keep max 10

    // Clear existing undo timer
    const { undoTimer } = state;
    if (undoTimer) clearTimeout(undoTimer);

    // Set timer to clear old entries (older than 30 seconds)
    const timer = setTimeout(() => {
      const currentTime = Date.now();
      const filteredStack = useWaterStore.getState().undoStack.filter(
        (entry) => currentTime - entry.timestamp < 30000
      );
      useWaterStore.setState({ undoStack: filteredStack, undoTimer: null });
    }, 30000);

    useWaterStore.setState({
      todayTotal: newTotal,
      logs: [...state.logs, newLog],
      undoStack: newStack,
      undoTimer: timer,
    });
  } catch (error) {
    console.error('[WaterStore] Log water failed:', error);
    throw new Error('Failed to log water intake');
  } finally {
    // Always release the lock so the next queued call can proceed
    resolveLock();
  }
}

/**
 * Delete a specific water log entry by id (today only).
 */
export async function deleteWaterLog(
  db: SQLiteDatabase,
  logId: number
): Promise<void> {
  const today = getTodayLocal();
  const now = Date.now();
  const state = useWaterStore.getState();

  try {
    await db.runAsync('DELETE FROM water_logs WHERE id = ?', [logId]);

    const newLogs = state.logs.filter(l => l.id !== logId);
    // Sum capacity_ml of remaining logs — don't trust running_total as it's stale after deletion
    const newTotal = newLogs.reduce((sum, l) => sum + l.capacity_ml, 0);
    const dailyGoal = state.dailyGoal;

    // Update daily summary
    if (newTotal <= 0) {
      await db.runAsync('DELETE FROM water_daily_summary WHERE date = ?', [today]);
    } else {
      await db.runAsync(
        'UPDATE water_daily_summary SET total_ml = ?, goal_met = ?, updated_at = ? WHERE date = ?',
        [newTotal, newTotal >= dailyGoal ? 1 : 0, now, today]
      );
    }

    useWaterStore.setState({
      logs: newLogs,
      todayTotal: newTotal,
    });
  } catch (error) {
    console.error('[WaterStore] Delete log failed:', error);
    throw new Error('Failed to delete water log');
  }
}
export async function undoLastLog(db: SQLiteDatabase): Promise<void> {
  const state = useWaterStore.getState();
  const { undoStack } = state;
  
  // Get the most recent undo entry
  const undoEntry = undoStack[undoStack.length - 1];
  if (!undoEntry) return;

  try {
    await db.runAsync('DELETE FROM water_logs WHERE id = ?', [undoEntry.logId]);

    // Update daily summary
    const today = getTodayLocal();
    const now = Date.now();
    const newTotal = undoEntry.previousTotal;
    const dailyGoal = useWaterStore.getState().dailyGoal;
    if (newTotal <= 0) {
      await db.runAsync('DELETE FROM water_daily_summary WHERE date = ?', [today]);
    } else {
      await db.runAsync(
        'UPDATE water_daily_summary SET total_ml = ?, goal_met = ?, updated_at = ? WHERE date = ?',
        [newTotal, newTotal >= dailyGoal ? 1 : 0, now, today]
      );
    }

    // Remove from stack and clear timer if stack is now empty
    const newStack = undoStack.slice(0, -1);
    if (newStack.length === 0 && state.undoTimer) {
      clearTimeout(state.undoTimer);
    }

    useWaterStore.setState({
      todayTotal: undoEntry.previousTotal,
      logs: state.logs.filter((l) => l.id !== undoEntry.logId),
      undoStack: newStack,
      undoTimer: newStack.length === 0 ? null : state.undoTimer,
    });
  } catch (error) {
    console.error('[WaterStore] Undo failed:', error);
    // Re-throw for UI to handle
    throw new Error('Failed to undo water log');
  }
}
