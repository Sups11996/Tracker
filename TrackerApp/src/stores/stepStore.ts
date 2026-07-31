import { create } from 'zustand';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

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

let subscription: ReturnType<NativeEventEmitter['addListener']> | null = null;
let statusSub:    ReturnType<NativeEventEmitter['addListener']> | null = null;

export function subscribeToStepEvents() {
  if (Platform.OS !== 'android') return;
  try {
    const emitter = new NativeEventEmitter();

    subscription = emitter.addListener('STEP_UPDATE', (raw: string) => {
      try {
        const data = JSON.parse(raw);
        useStepStore.getState().setToday(
          Math.floor(data.steps ?? 0),
          data.distance ?? 0,
          data.calories ?? 0
        );
      } catch (_) {}
    });

    statusSub = emitter.addListener('STEP_STATUS', (status: string) => {
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
    const today = getTodayDate();

    // Today's row
    const row = await db.getFirstAsync<DayStepRecord>(
      'SELECT * FROM daily_steps WHERE date = ?', [today]
    );
    if (row) {
      useStepStore.getState().setToday(row.steps, row.distance_m, row.calories);
    }

    // Tracking state
    const state = await db.getFirstAsync<{
      is_paused: number; is_vehicle_mode: number; daily_goal: number;
    }>('SELECT * FROM step_tracking_state WHERE id = 1');
    if (state) {
      const status: TrackingStatus =
        state.is_vehicle_mode ? 'vehicle' :
        state.is_paused       ? 'paused'  : 'tracking';
      useStepStore.getState().setStatus(status);
      useStepStore.getState().setGoal(state.daily_goal);
    }

    // Weekly data (last 7 days)
    const weekly = await db.getAllAsync<DayStepRecord>(
      `SELECT * FROM daily_steps
       WHERE date >= date('now','-6 days')
       ORDER BY date ASC`
    );
    useStepStore.getState().setWeeklyData(weekly);

    // Monthly data (last 30 days)
    const monthly = await db.getAllAsync<DayStepRecord>(
      `SELECT * FROM daily_steps
       WHERE date >= date('now','-29 days')
       ORDER BY date ASC`
    );
    useStepStore.getState().setMonthlyData(monthly);

  } catch (e) {
    console.error('[hydrateStepStore]', e);
  }
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}
