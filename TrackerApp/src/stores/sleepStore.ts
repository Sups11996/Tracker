import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

const SleepServiceModule = Platform.OS === 'android'
  ? requireNativeModule('SleepServiceModule')
  : null;

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
      const actualDuration = sessionDuration - latencyMins;
      
      return {
        isActive: false,
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
    // Check for active session
    const activeRow = await db.getFirstAsync<SleepSession>(
      'SELECT * FROM sleep_sessions WHERE is_active = 1 ORDER BY start_time DESC LIMIT 1'
    );
    
    if (activeRow) {
      const elapsed = Math.floor((Date.now() - activeRow.start_time) / 1000 / 60);
      useSleepStore.setState({
        isActive: true,
        sessionStartTime: activeRow.start_time,
        elapsedMinutes: elapsed,
      });
    }
    
    // Load last completed session
    const lastRow = await db.getFirstAsync<SleepSession>(
      'SELECT * FROM sleep_sessions WHERE is_active = 0 ORDER BY end_time DESC LIMIT 1'
    );
    
    if (lastRow && lastRow.actual_duration) {
      const quality = getQuality(lastRow.actual_duration, lastRow.goal_mins || 480);
      useSleepStore.setState({
        lastNightDuration: lastRow.actual_duration,
        lastNightQuality: quality,
      });
    }
    
    // Load recent sessions (last 7 days)
    const recent = await db.getAllAsync<SleepSession>(
      'SELECT * FROM sleep_sessions WHERE is_active = 0 ORDER BY date DESC LIMIT 7'
    );
    
    useSleepStore.setState({ recentSessions: recent });
    
    // Load goal from user profile or kv_store
    const goalRow = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM kv_store WHERE key = 'sleep_goal_mins'"
    );
    
    if (goalRow) {
      useSleepStore.setState({ goalMinutes: parseInt(goalRow.value, 10) });
    }
    
  } catch (error) {
    console.error('Failed to hydrate sleep store:', error);
  }
}

/**
 * Start a new sleep session.
 * Inserts a new active record into SQLite.
 */
export async function startSleepSession(db: SQLiteDatabase): Promise<void> {
  const now = Date.now();
  const date = new Date(now).toISOString().split('T')[0];
  const goalMinutes = useSleepStore.getState().goalMinutes;
  
  try {
    await db.runAsync(
      `INSERT INTO sleep_sessions 
       (date, start_time, goal_mins, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [date, now, goalMinutes, now, now]
    );
    
    useSleepStore.getState().startSession(now);
    
    // Start native foreground service if Android
    if (Platform.OS === 'android' && SleepServiceModule) {
      SleepServiceModule.startService(now);
    }
    
  } catch (error) {
    console.error('Failed to start sleep session:', error);
    throw error;
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
  if (!state.isActive || !state.sessionStartTime) {
    throw new Error('No active sleep session');
  }
  
  const now = Date.now();
  const sessionDuration = Math.floor((now - state.sessionStartTime) / 1000 / 60);
  const actualDuration = sessionDuration - latencyMins;
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
       WHERE is_active = 1`,
      [now, sessionDuration, latencyMins, actualDuration, goalMet, now]
    );
    
    useSleepStore.getState().endSession(now, latencyMins);
    
    // Stop native foreground service if Android
    if (Platform.OS === 'android' && SleepServiceModule) {
      SleepServiceModule.stopService();
    }
    
  } catch (error) {
    console.error('Failed to end sleep session:', error);
    throw error;
  }
}
