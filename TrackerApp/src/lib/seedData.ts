/**
 * Seed data generator for testing and demo purposes
 * Generates realistic-looking data for the past 3 months
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import { getTodayLocal, formatDateLocal } from './dateUtils';

/**
 * Generate random number between min and max (inclusive)
 */
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random boolean with given probability (0-1)
 */
function randomChance(probability: number): boolean {
  return Math.random() < probability;
}

/**
 * Get date N days ago from today
 */
function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDateLocal(date);
}

/**
 * Generate seed data for a specific number of days
 */
export async function generateSeedDataForDays(db: SQLiteDatabase, days: number): Promise<{
  steps: number;
  sleep: number;
  water: number;
  calories: number;
  abc: number;
}> {
  const today = getTodayLocal();
  const counts = { steps: 0, sleep: 0, water: 0, calories: 0, abc: 0 };
  
  try {
    await db.execAsync('BEGIN TRANSACTION');

    // Generate data for specified number of days
    for (let daysAgo = days; daysAgo >= 1; daysAgo--) {
      const date = getDaysAgo(daysAgo);
      const now = Date.now();
      
      // Generate Steps Data (70% chance of having data)
      if (randomChance(0.7)) {
        const baseSteps = randomBetween(3000, 15000);
        const steps = baseSteps;
        const distance = Math.round(steps * 0.75); // ~0.75m per step
        const calories = Math.round(steps * 0.04); // ~0.04 cal per step
        const goal = 8000;
        const goalMet = steps >= goal ? 1 : 0;
        
        await db.runAsync(
          `INSERT OR REPLACE INTO daily_steps (date, steps, distance_m, calories, goal, goal_met, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [date, steps, distance, calories, goal, goalMet, now, now]
        );
        counts.steps++;
      }

      // Generate Sleep Data (75% chance of having data)
      if (randomChance(0.75)) {
        const sleepDurationMins = randomBetween(300, 540); // 5-9 hours
        const latencyMins = randomBetween(5, 30);
        const goalMins = 480; // 8 hours
        const goalMet = sleepDurationMins >= goalMins ? 1 : 0;
        
        // Calculate timestamps (assume sleep from previous day)
        const sleepDate = new Date(date);
        sleepDate.setHours(22, randomBetween(0, 59), 0); // Sleep around 10 PM
        const startTime = sleepDate.getTime();
        const endTime = startTime + (sleepDurationMins * 60 * 1000);
        
        await db.runAsync(
          `INSERT OR REPLACE INTO sleep_sessions 
           (date, start_time, end_time, session_duration, latency_mins, actual_duration, goal_mins, goal_met, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
          [date, startTime, endTime, sleepDurationMins, latencyMins, sleepDurationMins - latencyMins, goalMins, goalMet, now, now]
        );
        counts.sleep++;
      }

      // Generate Water Data (80% chance of having data)
      if (randomChance(0.8)) {
        const totalMl = randomBetween(1000, 3500); // 1-3.5 liters
        const goalMl = 2400; // 2.4 liters
        const goalMet = totalMl >= goalMl ? 1 : 0;
        
        await db.runAsync(
          `INSERT OR REPLACE INTO water_daily_summary (date, total_ml, goal_ml, goal_met, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [date, totalMl, goalMl, goalMet, now, now]
        );
        counts.water++;
      }

      // Generate Calories Data (60% chance of having workout)
      if (randomChance(0.6)) {
        const walkingCalories = Math.round(randomBetween(3000, 15000) * 0.04);
        const workoutCalories = randomBetween(100, 500);
        const totalCalories = walkingCalories + workoutCalories;
        
        await db.runAsync(
          `INSERT OR REPLACE INTO calories_daily_summary (date, walking_calories, workout_calories, total_calories, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [date, walkingCalories, workoutCalories, totalCalories, now, now]
        );
        
        // Add workout log entry
        const workoutTime = new Date(date).getTime() + randomBetween(6, 20) * 3600000; // 6 AM - 8 PM
        const intensity = ['light', 'moderate', 'intense'][randomBetween(0, 2)];
        const duration = randomBetween(20, 90);
        
        await db.runAsync(
          `INSERT INTO workout_logs (date, logged_at, duration_mins, intensity, calories, note, weight_kg_snap, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [date, workoutTime, duration, intensity, workoutCalories, '', 70, now, now]
        );
        counts.calories++;
      }

      // Generate ABC Data (65% chance of having data)
      if (randomChance(0.65)) {
        const count = randomBetween(1, 8);
        
        await db.runAsync(
          `INSERT OR REPLACE INTO abc_daily_summary (date, count, created_at, updated_at)
           VALUES (?, ?, ?, ?)`,
          [date, count, now, now]
        );
        
        // Add individual ABC log entries
        for (let i = 0; i < count; i++) {
          const logTime = new Date(date).getTime() + randomBetween(8, 22) * 3600000; // 8 AM - 10 PM
          await db.runAsync(
            `INSERT INTO abc_logs (date, logged_at, created_at)
             VALUES (?, ?, ?)`,
            [date, logTime, now]
          );
        }
        counts.abc++;
      }
    }

    await db.execAsync('COMMIT');
    return counts;
  } catch (error) {
    await db.execAsync('ROLLBACK');
    console.error('[SeedData] Generation failed:', error);
    throw error;
  }
}

/**
 * Generate seed data for past 3 months (90 days)
 */
export async function generateSeedData(db: SQLiteDatabase): Promise<{
  steps: number;
  sleep: number;
  water: number;
  calories: number;
  abc: number;
}> {
  return generateSeedDataForDays(db, 90);
}

/**
 * Clear all seed data (keeps today's data)
 */
export async function clearSeedData(db: SQLiteDatabase): Promise<void> {
  const today = getTodayLocal();
  
  try {
    await db.execAsync('BEGIN TRANSACTION');
    
    // Delete historical data (keep today)
    await db.runAsync('DELETE FROM daily_steps WHERE date < ?', [today]);
    await db.runAsync('DELETE FROM sleep_sessions WHERE date < ? AND is_active = 0', [today]);
    await db.runAsync('DELETE FROM water_daily_summary WHERE date < ?', [today]);
    await db.runAsync('DELETE FROM water_logs WHERE date < ?', [today]);
    await db.runAsync('DELETE FROM calories_daily_summary WHERE date < ?', [today]);
    await db.runAsync('DELETE FROM workout_logs WHERE date < ?', [today]);
    await db.runAsync('DELETE FROM abc_daily_summary WHERE date < ?', [today]);
    await db.runAsync('DELETE FROM abc_logs WHERE date < ?', [today]);
    
    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    console.error('[SeedData] Clear failed:', error);
    throw error;
  }
}

/**
 * Check if seed data exists
 */
export async function hasSeedData(db: SQLiteDatabase): Promise<boolean> {
  try {
    const thirtyDaysAgo = getDaysAgo(30);
    
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM daily_steps WHERE date < ?`,
      [thirtyDaysAgo]
    );
    
    return (result?.count || 0) > 20; // Has significant historical data
  } catch (error) {
    return false;
  }
}
