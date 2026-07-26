/**
 * Placeholder types for future health-tracking features.
 * Each feature will expand its own section when implemented.
 */

export interface DailySteps {
  user_id: string;
  date: string;       // YYYY-MM-DD
  count: number;
  goal: number;
}

export interface WaterIntake {
  user_id: string;
  date: string;
  ml: number;
  goal_ml: number;
}

export interface SleepRecord {
  user_id: string;
  date: string;
  duration_minutes: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
}

export interface CalorieRecord {
  user_id: string;
  date: string;
  consumed: number;
  burned: number;
  goal: number;
}

export interface ScreenTimeRecord {
  user_id: string;
  date: string;
  minutes: number;
  goal_minutes: number;
}
