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
      } catch (_) {}
    });

    statusSub = DeviceEventEmitter.addListener('STEP_STATUS', (status: string) => {
      useStepStore.getState().setStatus(status as TrackingStatus);
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

    // DON'T load today's steps from DB - they come from native service in real-time
    // Only load if today's steps are currently 0 (app just started)
    const currentSteps = useStepStore.getState().todaySteps;
    if (currentSteps === 0) {
      const row = await db.getFirstAsync<DayStepRecord>(
        'SELECT * FROM daily_steps WHERE date = ?', [today]
      );
      if (row) {
        useStepStore.getState().setToday(row.steps, row.distance_m, row.calories);
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

    
    // Only refresh weekly/monthly historical data, don't reload today's data
    // (today's data comes from the native service in real-time)
    
    const today = getTodayLocal();
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

    const currentDate = new Date();
    const startOfMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
    
    const monthly = await db.getAllAsync<DayStepRecord>(
      `SELECT * FROM daily_steps
       WHERE date >= ? AND date <= ?
       ORDER BY date ASC`,
      [startOfMonth, today]
    );
    useStepStore.getState().setMonthlyData(monthly);
    
  } catch (error) {
  }
}
