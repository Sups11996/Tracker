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

    // Today's total = last running_total entry, or 0
    const todayTotal = logs.length > 0 ? logs[logs.length - 1].running_total : 0;

    // Load daily goal from user profile
    const profile = await db.getFirstAsync<{ water_goal_ml: number }>(
      'SELECT water_goal_ml FROM user_profile WHERE id = 1'
    );

    useWaterStore.setState({
      containers,
      logs,
      todayTotal,
      dailyGoal: profile?.water_goal_ml ?? 2400,
    });
  } catch (error) {
    console.error('Failed to hydrate water store:', error);
  }
}

/**
 * Log a water intake entry. Returns the new log id.
 */
export async function logWater(
  db: SQLiteDatabase,
  container: WaterContainer
): Promise<void> {
  const now = Date.now();
  const today = getTodayLocal();
  const state = useWaterStore.getState();
  const newTotal = state.todayTotal + container.capacity_ml;

  try {
    const result = await db.runAsync(
      `INSERT INTO water_logs (date, logged_at, container_id, container_name, capacity_ml, running_total, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [today, now, container.id, container.name, container.capacity_ml, newTotal, now]
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
    console.error('Failed to log water:', error);
    throw error;
  }
}

/**
 * Undo the last water log entry within the 30-second window.
 */
export async function undoLastLog(db: SQLiteDatabase): Promise<void> {
  const state = useWaterStore.getState();
  const { undoStack } = state;
  
  // Get the most recent undo entry
  const undoEntry = undoStack[undoStack.length - 1];
  if (!undoEntry) return;

  try {
    await db.runAsync('DELETE FROM water_logs WHERE id = ?', [undoEntry.logId]);

    // Remove from stack
    const newStack = undoStack.slice(0, -1);

    useWaterStore.setState({
      todayTotal: undoEntry.previousTotal,
      logs: state.logs.filter((l) => l.id !== undoEntry.logId),
      undoStack: newStack,
    });
  } catch (error) {
    console.error('Failed to undo water log:', error);
    throw error;
  }
}
