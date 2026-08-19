import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { getTodayLocal } from '../lib/dateUtils';

export type TrackingStatus = 'tracking' | 'paused' | 'vehicle' | 'unavailable';

export interface DayStepRecord {
  date: string;
  steps: number;
  distance_m: number;
  calories: number;
  goal: number;
  goal_met: boolean;
}

interface StepState {
  // Today
  todaySteps: number;
  todayDistance: number;
  todayCalories: number;
  dailyGoal: number;
  status: TrackingStatus;

  // History
  weeklyData: DayStepRecord[];
  monthlyData: DayStepRecord[];

  // Actions
  setToday: (steps: number, distance: number, calories: number) => void;
  setStatus: (status: TrackingStatus) => void;
  setGoal: (goal: number) => void;
  setWeeklyData: (data: DayStepRecord[]) => void;
  setMonthlyData: (data: DayStepRecord[]) => void;
}

export const useStepStore = create<StepState>((set) => ({
  todaySteps:    0,
  todayDistance: 0,
  todayCalories: 0,
  dailyGoal:     8000,
  status:        'tracking',
  weeklyData:    [],
  monthlyData:   [],

  setToday: (steps, distance, calories) =>
    set({ todaySteps: steps, todayDistance: distance, todayCalories: calories }),
  setStatus: (status) => set({ status }),
  setGoal:   (goal)   => set({ dailyGoal: goal }),
  setWeeklyData:  (data) => set({ weeklyData: data }),
  setMonthlyData: (data) => set({ monthlyData: data }),
}));

// ── Native event subscription ──────────────────────────────────────────────────

let subscription: { remove: () => void } | null = null;
let statusSub:    { remove: () => void } | null = null;

export function subscribeToStepEvents() {
  if (Platform.OS !== 'android') return;
  // Guard against double-subscription if component remounts
  if (subscription !== null) return;
  try {
    // Use DeviceEventEmitter which works without a module reference on Android
    const { DeviceEventEmitter } = require('react-native');

    subscription = DeviceEventEmitter.addListener('STEP_UPDATE', (raw: string) => {
      try {
        const data = JSON.parse(raw);
        useStepStore.getState().setToday(
          Math.floor(data.steps ?? 0),
          data.distance ?? 0,
          data.calories ?? 0
        );
      } catch (error) {
        // JSON parse failed - native sent invalid data
        // Don't log (fires 60x/min) - next update will succeed
      }
    });

    // Listen to status events from native service (notification actions)
    statusSub = DeviceEventEmitter.addListener('STEP_STATUS', (status: string) => {
      // Update store when notification actions change status
      const newStatus = status as TrackingStatus;
      if (newStatus === 'paused' || newStatus === 'tracking') {
        useStepStore.getState().setStatus(newStatus);
      }
    });
  } catch (_) {}
}

export function unsubscribeFromStepEvents() {
  subscription?.remove();
  statusSub?.remove();
  subscription = null;
  statusSub = null;
}

// ── DB hydration ──────────────────────────────────────────────────────────────

export async function hydrateStepStore(db: SQLite.SQLiteDatabase) {
  try {
    const today = getTodayLocal();

    // Load today's steps from DB on hydration.
    // Take the higher of DB value and current store value (native service may have
    // already sent a STEP_UPDATE with a more recent count before hydration ran).
    const row = await db.getFirstAsync<DayStepRecord>(
      'SELECT * FROM daily_steps WHERE date = ?', [today]
    );
    if (row) {
      const currentSteps = useStepStore.getState().todaySteps;
      // Only overwrite if DB has more steps — native service value takes precedence
      if (row.steps > currentSteps) {
        useStepStore.getState().setToday(row.steps, row.distance_m, row.calories);
      }
    } else {
      // New day — only reset if native service hasn't sent anything yet
      const currentSteps = useStepStore.getState().todaySteps;
      if (currentSteps === 0) {
        useStepStore.getState().setToday(0, 0, 0);
      }
    }

    // Tracking state
    const state = await db.getFirstAsync<{
      is_tracking: number; is_paused: number; is_vehicle_mode: number; daily_goal: number;
    }>('SELECT * FROM step_tracking_state WHERE id = 1');
    if (state) {
      const status: TrackingStatus =
        state.is_tracking === 0 ? 'unavailable' :
        state.is_vehicle_mode ? 'vehicle' :
        state.is_paused       ? 'paused'  : 'tracking';
      useStepStore.getState().setStatus(status);
      useStepStore.getState().setGoal(state.daily_goal);
    }

    // Weekly data (last 7 days using local timezone)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const startOfWeek = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgo.getDate()).padStart(2, '0')}`;
    
    const weekly = await db.getAllAsync<DayStepRecord>(
      `SELECT * FROM daily_steps
       WHERE date >= ? AND date <= ?
       ORDER BY date ASC`,
      [startOfWeek, today]
    );
    useStepStore.getState().setWeeklyData(weekly);

    // Monthly data (current month only - from 1st to today using local timezone)
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    
    const monthly = await db.getAllAsync<DayStepRecord>(
      `SELECT * FROM daily_steps
       WHERE date >= ? AND date <= ?
       ORDER BY date ASC`,
      [startOfMonth, today]
    );
    useStepStore.getState().setMonthlyData(monthly);

  } catch (e) {
    console.error('[StepStore] Hydration failed:', e);
    // Set safe defaults - app continues to work
    useStepStore.setState({
      todaySteps: 0,
      todayDistance: 0,
      todayCalories: 0,
      dailyGoal: 8000,
      status: 'unavailable',
      weeklyData: [],
      monthlyData: [],
    });
  }
}

/**
 * Save current step data to the database.
 * Uses INSERT OR REPLACE to update today's record or create if it doesn't exist.
 * @param dateOverride - Optional date to save to (for saving yesterday's data on date change)
 */
export async function saveStepData(db: SQLite.SQLiteDatabase, dateOverride?: string): Promise<void> {
  try {
    const state = useStepStore.getState();
    const dateToSave = dateOverride ?? getTodayLocal();
    const goalMet = state.todaySteps >= state.dailyGoal ? 1 : 0;
    const now = Date.now();

    await db.runAsync(
      `INSERT OR REPLACE INTO daily_steps (date, steps, distance_m, calories, goal, goal_met, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 
         COALESCE((SELECT created_at FROM daily_steps WHERE date = ?), ?),
         ?)`,
      [dateToSave, state.todaySteps, state.todayDistance, state.todayCalories, state.dailyGoal, goalMet, dateToSave, now, now]
    );

    // Keep calories_daily_summary in sync so exports always show correct walking calories
    // even on days with no workout logged
    const workoutRow = await db.getFirstAsync<{ workout_calories: number; total_calories: number }>(
      'SELECT workout_calories, total_calories FROM calories_daily_summary WHERE date = ?',
      [dateToSave]
    );
    const workoutCal = workoutRow?.workout_calories ?? 0;
    const totalCal = Math.round(state.todayCalories + workoutCal);
    await db.runAsync(
      `INSERT INTO calories_daily_summary (date, walking_calories, workout_calories, total_calories, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         walking_calories = ?,
         total_calories = ?,
         updated_at = ?`,
      [dateToSave, state.todayCalories, workoutCal, totalCal, now, now,
       state.todayCalories, totalCal, now]
    );
  } catch (error: any) {
    // DB connection closed (app resume race condition) — next foreground hydration will reconcile
    console.error('[StepStore] Save step data failed:', error);
    // Don't throw - app continues
  }
}
