import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import { getTodayLocal, getYesterdayLocal } from '../lib/dateUtils';

const SleepServiceModule = (() => {
  if (Platform.OS !== 'android') return null;
  try {
    return requireNativeModule('SleepServiceModule');
  } catch {
    return null;
  }
})();

interface SleepSession {
  id: number;
  date: string;
  start_time: number;
  end_time: number | null;
  session_duration: number | null;
  latency_mins: number;
  actual_duration: number | null;
  goal_mins: number | null;
  goal_met: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

interface SleepState {
  // Active session
  isActive: boolean;
  sessionId: number | null;      // DB id of the active row — scopes UPDATE to one row
  sessionStartTime: number | null;
  elapsedMinutes: number;
  
  // Last completed session
  lastNightDuration: number | null; // minutes
  lastNightQuality: 'good' | 'fair' | 'poor' | null;
  
  // History (last 7 days)
  recentSessions: SleepSession[];
  
  // Settings
  goalMinutes: number;
  
  // Actions
  startSession: (startTime: number) => void;
  endSession: (endTime: number, latencyMins: number) => void;
  updateElapsed: (minutes: number) => void;
}

export const useSleepStore = create<SleepState>((set) => ({
  // Initial state
  isActive: false,
  sessionId: null,
  sessionStartTime: null,
  elapsedMinutes: 0,
  lastNightDuration: null,
  lastNightQuality: null,
  recentSessions: [],
  goalMinutes: 480, // 8 hours default
  
  // Actions
  startSession: (startTime: number) => {
    set({
      isActive: true,
      sessionStartTime: startTime,
      elapsedMinutes: 0,
    });
  },
  
  endSession: (endTime: number, latencyMins: number) => {
    set((state) => {
      if (!state.sessionStartTime) return state;
      
      const sessionDuration = Math.floor((endTime - state.sessionStartTime) / 1000 / 60);
      const actualDuration = Math.max(0, sessionDuration - latencyMins);
      
      return {
        isActive: false,
        sessionId: null,
        sessionStartTime: null,
        elapsedMinutes: 0,
        lastNightDuration: actualDuration,
        lastNightQuality: getQuality(actualDuration, state.goalMinutes),
      };
    });
  },
  
  updateElapsed: (minutes: number) => {
    set({ elapsedMinutes: minutes });
  },
}));

function getQuality(actual: number, goal: number): 'good' | 'fair' | 'poor' {
  const percentage = (actual / goal) * 100;
  if (percentage >= 90) return 'good';
  if (percentage >= 70) return 'fair';
  return 'poor';
}

/**
 * Hydrate the sleep store from SQLite.
 * Loads active session if exists, last completed session, and recent history.
 */
export async function hydrateSleepStore(db: SQLiteDatabase): Promise<void> {
  try {
    // Load goal FIRST so quality calculations use the correct value
    const goalRow = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM kv_store WHERE key = 'sleep_goal_mins'"
    );
    const goalMinutes = goalRow ? parseInt(goalRow.value, 10) : 480;
    useSleepStore.setState({ goalMinutes });

    // Check for active session
    const activeRow = await db.getFirstAsync<SleepSession>(
      'SELECT * FROM sleep_sessions WHERE is_active = 1 ORDER BY start_time DESC LIMIT 1'
    );
    
    if (activeRow) {
      const elapsed = Math.floor((Date.now() - activeRow.start_time) / 1000 / 60);
      useSleepStore.setState({
        isActive: true,
        sessionId: activeRow.id,
        sessionStartTime: activeRow.start_time,
        elapsedMinutes: elapsed,
      });
    }
    
    // Load last completed session(s) — sum night sleep only (>= 3h) for yesterday
    // Naps (typically < 3h) are excluded to avoid inflating the displayed sleep total
    const yesterday = getYesterdayLocal();
    const yesterdaySum = await db.getFirstAsync<{ total: number }>(
      'SELECT SUM(actual_duration) as total FROM sleep_sessions WHERE is_active = 0 AND actual_duration IS NOT NULL AND session_duration >= 180 AND date = ?',
      [yesterday]
    );

    if (yesterdaySum?.total) {
      const quality = getQuality(yesterdaySum.total, goalMinutes);
      useSleepStore.setState({
        lastNightDuration: yesterdaySum.total,
        lastNightQuality: quality,
      });
    } else {
      // Fallback: most recent completed session from any date
      const lastRow = await db.getFirstAsync<SleepSession>(
        'SELECT * FROM sleep_sessions WHERE is_active = 0 ORDER BY end_time DESC LIMIT 1'
      );
      if (lastRow) {
        const sumRow = await db.getFirstAsync<{ total: number }>(
          'SELECT SUM(actual_duration) as total FROM sleep_sessions WHERE is_active = 0 AND actual_duration IS NOT NULL AND date = ?',
          [lastRow.date]
        );
        const total = sumRow?.total || lastRow.actual_duration || 0;
        const quality = getQuality(total, lastRow.goal_mins || goalMinutes);
        useSleepStore.setState({
          lastNightDuration: total,
          lastNightQuality: quality,
        });
      }
    }
    
    // Load recent sessions (today + yesterday) for log display
    const recent = await db.getAllAsync<SleepSession>(
      `SELECT * FROM sleep_sessions WHERE is_active = 0 AND date >= ? ORDER BY end_time DESC LIMIT 20`,
      [getYesterdayLocal()]
    );
    
    useSleepStore.setState({ recentSessions: recent });
    
  } catch (error) {
    console.error('[SleepStore] Hydration failed:', error);
    // Set safe defaults
    useSleepStore.setState({
      isActive: false,
      sessionStartTime: null,
      elapsedMinutes: 0,
      lastNightDuration: null,
      lastNightQuality: null,
      recentSessions: [],
      goalMinutes: 480,
    });
  }
}

/**
 * Log a manual sleep session (past sleep or nap).
 * Night sleep → yesterday's date
 * Nap → today's date
 */
export async function logManualSleep(
  db: SQLiteDatabase,
  type: 'night' | 'nap',
  startTime: number,
  endTime: number,
): Promise<void> {
  const now = Date.now();
  const goalMinutes = useSleepStore.getState().goalMinutes;
  const sessionDuration = Math.floor((endTime - startTime) / 1000 / 60);
  const actualDuration = Math.max(0, sessionDuration);
  const goalMet = actualDuration >= goalMinutes ? 1 : 0;

  // Derive date from the actual start timestamp (local timezone),
  // so the session lands on the correct date regardless of when it's logged
  const startDate = new Date(startTime);
  const date = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

  try {
    await db.runAsync(
      `INSERT INTO sleep_sessions
       (date, start_time, end_time, session_duration, latency_mins, actual_duration, goal_mins, goal_met, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, 0, ?, ?)`,
      [date, startTime, endTime, sessionDuration, actualDuration, goalMinutes, goalMet, now, now]
    );

    await hydrateSleepStore(db);
  } catch (error) {
    console.error('[SleepStore] Log manual sleep failed:', error);
    throw new Error('Failed to log sleep');
  }
}

/**
 * Delete a sleep session by id and refresh store.
 */
export async function deleteSleepSession(
  db: SQLiteDatabase,
  sessionId: number
): Promise<void> {
  try {
    await db.runAsync('DELETE FROM sleep_sessions WHERE id = ?', [sessionId]);
    await hydrateSleepStore(db);
  } catch (error) {
    console.error('[SleepStore] Delete session failed:', error);
    throw new Error('Failed to delete sleep session');
  }
}

/**
 * Start a new sleep session.
 * Inserts a new active record into SQLite.
 */
export async function startSleepSession(db: SQLiteDatabase): Promise<void> {
  const now = Date.now();
  const date = getTodayLocal();  // Use local timezone instead of UTC
  const goalMinutes = useSleepStore.getState().goalMinutes;
  
  try {
    const result = await db.runAsync(
      `INSERT INTO sleep_sessions 
       (date, start_time, goal_mins, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [date, now, goalMinutes, now, now]
    );
    
    // Store the new row's id so endSleepSession can scope UPDATE to this row only
    useSleepStore.setState({ sessionId: result.lastInsertRowId });
    useSleepStore.getState().startSession(now);
    
    // Start native foreground service if Android
    if (Platform.OS === 'android' && SleepServiceModule) {
      SleepServiceModule.startService(now);
    }
    
  } catch (error) {
    console.error('[SleepStore] Start session failed:', error);
    throw new Error('Failed to start sleep session');
  }
}

/**
 * End the active sleep session with latency.
 * Updates the record, calculates actual sleep duration.
 */
export async function endSleepSession(
  db: SQLiteDatabase,
  latencyMins: number
): Promise<void> {
  const state = useSleepStore.getState();
  if (!state.isActive || !state.sessionStartTime || !state.sessionId) {
    throw new Error('No active sleep session');
  }
  
  const now = Date.now();
  const sessionDuration = Math.floor((now - state.sessionStartTime) / 1000 / 60);
  const actualDuration = Math.max(0, sessionDuration - latencyMins);
  const goalMet = actualDuration >= state.goalMinutes ? 1 : 0;
  
  try {
    await db.runAsync(
      `UPDATE sleep_sessions 
       SET end_time = ?, 
           session_duration = ?, 
           latency_mins = ?,
           actual_duration = ?,
           goal_met = ?,
           is_active = 0,
           updated_at = ?
       WHERE id = ?`,
      [now, sessionDuration, latencyMins, actualDuration, goalMet, now, state.sessionId]
    );
    
    useSleepStore.getState().endSession(now, latencyMins);
    
    // Stop native foreground service if Android
    if (Platform.OS === 'android' && SleepServiceModule) {
      SleepServiceModule.stopService();
    }
    
  } catch (error) {
    console.error('[SleepStore] End session failed:', error);
    throw new Error('Failed to end sleep session');
  }
}
