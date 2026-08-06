import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useStepStore } from './stepStore';
import { getTodayLocal } from '../lib/dateUtils';

export type Intensity = 'light' | 'moderate' | 'intense';

export interface WorkoutLog {
  id: number;
  date: string;
  logged_at: number;
  duration_mins: number;
  intensity: Intensity;
  calories: number;
  note: string | null;
}

interface CaloriesState {
  walkingCalories: number;
  workoutCalories: number;
  totalCalories: number;
  workoutLogs: WorkoutLog[];
  setWalkingCalories: (cal: number) => void;
  setWorkoutLogs: (logs: WorkoutLog[]) => void;
  recalcTotal: () => void;
}

export const useCaloriesStore = create<CaloriesState>((set, get) => ({
  walkingCalories: 0,
  workoutCalories: 0,
  totalCalories: 0,
  workoutLogs: [],

  setWalkingCalories: (cal) => {
    set({ walkingCalories: cal });
    get().recalcTotal();
  },

  setWorkoutLogs: (logs) => {
    const workoutCalories = logs.reduce((sum, l) => sum + l.calories, 0);
    set({ workoutLogs: logs, workoutCalories });
    get().recalcTotal();
  },

  recalcTotal: () => {
    const { walkingCalories, workoutCalories } = get();
    set({ totalCalories: Math.round(walkingCalories + workoutCalories) });
  },
}));

/**
 * MET values per intensity level.
 * Used to estimate calories: C = MET × weight_kg × duration_hours
 */
const MET: Record<Intensity, number> = {
  light: 3.5,
  moderate: 6.0,
  intense: 10.0,
};

export function calcWorkoutCalories(
  durationMins: number,
  intensity: Intensity,
  weightKg: number
): number {
  return Math.round(MET[intensity] * weightKg * (durationMins / 60));
}

/**
 * Hydrate calories store from SQLite.
 * Walking calories come from the step store (already loaded by hydrateStepStore).
 */
export async function hydrateCaloriesStore(db: SQLiteDatabase): Promise<void> {
  try {
    const today = getTodayLocal();

    // Walking calories — pull directly from step store
    const walkingCal = useStepStore.getState().todayCalories;

    // Today's workout logs
    const logs = await db.getAllAsync<WorkoutLog>(
      `SELECT id, date, logged_at, duration_mins, intensity, calories, note
       FROM workout_logs
       WHERE date = ?
       ORDER BY logged_at ASC`,
      [today]
    );

    const workoutCal = logs.reduce((sum, l) => sum + l.calories, 0);

    useCaloriesStore.setState({
      walkingCalories: walkingCal,
      workoutCalories: workoutCal,
      totalCalories: Math.round(walkingCal + workoutCal),
      workoutLogs: logs,
    });
  } catch (error) {
    console.error('Failed to hydrate calories store:', error);
  }
}

/**
 * Log a new workout entry.
 */
export async function logWorkout(
  db: SQLiteDatabase,
  durationMins: number,
  intensity: Intensity,
  weightKg: number,
  note?: string
): Promise<void> {
  const now = Date.now();
  const today = getTodayLocal();
  const calories = calcWorkoutCalories(durationMins, intensity, weightKg);

  try {
    const result = await db.runAsync(
      `INSERT INTO workout_logs
         (date, logged_at, duration_mins, intensity, calories, note, weight_kg_snap, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [today, now, durationMins, intensity, calories, note ?? null, weightKg, now, now]
    );

    const newLog: WorkoutLog = {
      id: result.lastInsertRowId,
      date: today,
      logged_at: now,
      duration_mins: durationMins,
      intensity,
      calories,
      note: note ?? null,
    };

    const state = useCaloriesStore.getState();
    const newLogs = [...state.workoutLogs, newLog];
    const workoutCal = newLogs.reduce((sum, l) => sum + l.calories, 0);

    useCaloriesStore.setState({
      workoutLogs: newLogs,
      workoutCalories: workoutCal,
      totalCalories: Math.round(state.walkingCalories + workoutCal),
    });
  } catch (error) {
    console.error('Failed to log workout:', error);
    throw error;
  }
}

/**
 * Delete a workout log entry.
 */
export async function deleteWorkout(
  db: SQLiteDatabase,
  logId: number
): Promise<void> {
  try {
    await db.runAsync('DELETE FROM workout_logs WHERE id = ?', [logId]);

    const state = useCaloriesStore.getState();
    const newLogs = state.workoutLogs.filter(l => l.id !== logId);
    const workoutCal = newLogs.reduce((sum, l) => sum + l.calories, 0);

    useCaloriesStore.setState({
      workoutLogs: newLogs,
      workoutCalories: workoutCal,
      totalCalories: Math.round(state.walkingCalories + workoutCal),
    });
  } catch (error) {
    console.error('Failed to delete workout:', error);
    throw error;
  }
}
