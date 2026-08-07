import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Seeds 3 months of realistic test data for all features.
 * Month 1: 2 months ago | Month 2: last month | Month 3: current month (up to yesterday)
 */
export async function seedTestData(db: SQLiteDatabase): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build list of dates across last 3 months (skip today — live data)
  const dates: Date[] = [];
  for (let m = 2; m >= 0; m--) {
    const year = today.getFullYear();
    const month = today.getMonth() - m;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0); // last day of that month

    for (
      let d = new Date(firstDay);
      d <= lastDay;
      d.setDate(d.getDate() + 1)
    ) {
      const copy = new Date(d);
      // Skip today
      if (copy.toDateString() === today.toDateString()) continue;
      dates.push(copy);
    }
  }

  for (const date of dates) {
    const dateStr = formatDate(date);
    const dayOfWeek = date.getDay(); // 0 Sun, 6 Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const now = date.getTime() + 12 * 3600 * 1000; // noon timestamp

    // ── Steps ───────────────────────────────────────────────────────────────
    const goal = 8000;
    // Weekend = lazy, weekday = more active, some days crush it
    const baseSteps = isWeekend
      ? rand(3000, 7000)
      : rand(5000, 14000);
    const steps = baseSteps;
    const distance = parseFloat((steps * 0.00078).toFixed(2)); // ~0.78m per step
    const calories = parseFloat((steps * 0.04).toFixed(2));    // ~0.04 kcal per step
    const goalMet = steps >= goal ? 1 : 0;

    await db.runAsync(
      `INSERT OR REPLACE INTO daily_steps
         (date, steps, distance_m, calories, goal, goal_met, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [dateStr, steps, distance, calories, goal, goalMet, now, now]
    );

    // ── Sleep ────────────────────────────────────────────────────────────────
    const goalMins = 480; // 8h
    // Weekends: sleep in more; weekdays: normal
    const actualSleep = isWeekend ? rand(420, 540) : rand(300, 510);
    const latency = rand(5, 25);
    const sessionDuration = actualSleep + latency;
    const sleepGoalMet = actualSleep >= goalMins ? 1 : 0;
    const startTime = now - sessionDuration * 60 * 1000;
    const endTime = now;

    await db.runAsync(
      `INSERT OR REPLACE INTO sleep_sessions
         (date, start_time, end_time, session_duration, latency_mins,
          actual_duration, goal_mins, goal_met, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        dateStr, startTime, endTime, sessionDuration,
        latency, actualSleep, goalMins, sleepGoalMet, now, now,
      ]
    );

    // ── Water ────────────────────────────────────────────────────────────────
    const waterGoal = 2400;
    const glasses = rand(4, 10);
    const mlPerGlass = 250;
    let runningTotal = 0;

    for (let g = 0; g < glasses; g++) {
      runningTotal += mlPerGlass;
      const loggedAt = date.getTime() + (g + 1) * 90 * 60 * 1000; // every ~90min
      await db.runAsync(
        `INSERT INTO water_logs
           (date, logged_at, container_id, container_name, capacity_ml, running_total, created_at)
         VALUES (?, ?, 1, 'Glass', ?, ?, ?)`,
        [dateStr, loggedAt, mlPerGlass, runningTotal, now]
      );
    }

    // ── Workouts (not every day) ─────────────────────────────────────────────
    if (Math.random() > 0.5) {
      const intensities: Array<'light' | 'moderate' | 'intense'> = ['light', 'moderate', 'intense'];
      const intensity = intensities[Math.floor(Math.random() * 3)];
      const duration = rand(20, 60);
      const metMap = { light: 3.5, moderate: 6.0, intense: 10.0 };
      const workoutCal = Math.round(metMap[intensity] * 70 * (duration / 60));
      const loggedAt = now + 2 * 3600 * 1000;

      await db.runAsync(
        `INSERT INTO workout_logs
           (date, logged_at, duration_mins, intensity, calories, note, weight_kg_snap, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, null, 70, ?, ?)`,
        [dateStr, loggedAt, duration, intensity, workoutCal, now, now]
      );
    }

    // ── ABC ──────────────────────────────────────────────────────────────────
    const abcCount = rand(0, 15);
    if (abcCount > 0) {
      for (let i = 0; i < abcCount; i++) {
        const loggedAt = date.getTime() + i * 40 * 60 * 1000;
        await db.runAsync(
          `INSERT INTO abc_logs (date, logged_at, created_at) VALUES (?, ?, ?)`,
          [dateStr, loggedAt, now]
        );
      }
      await db.runAsync(
        `INSERT OR REPLACE INTO abc_daily_summary (date, count, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
        [dateStr, abcCount, now, now]
      );
    }
  }
}

/** Clear all historical data (keeps today) */
export async function clearSeedData(db: SQLiteDatabase): Promise<void> {
  const today = new Date();
  const dateStr = formatDate(today);

  await db.runAsync('DELETE FROM daily_steps WHERE date < ?', [dateStr]);
  await db.runAsync('DELETE FROM sleep_sessions WHERE is_active = 0 AND date < ?', [dateStr]);
  await db.runAsync('DELETE FROM water_logs WHERE date < ?', [dateStr]);
  await db.runAsync('DELETE FROM workout_logs WHERE date < ?', [dateStr]);
  await db.runAsync('DELETE FROM abc_logs WHERE date < ?', [dateStr]);
  await db.runAsync('DELETE FROM abc_daily_summary WHERE date < ?', [dateStr]);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
