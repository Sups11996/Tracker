import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Seed database with 3 months of realistic data for demo/screenshots
 */
export async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  const now = new Date();
  const today = now.getTime();
  
  // Generate dates for last 90 days
  const dates: string[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dates.push(dateStr);
  }

  // ── Steps ────────────────────────────────────────────────────────────────
  for (const date of dates) {
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Vary steps: 4000-12000 on weekdays, 2000-8000 on weekends
    const baseSteps = isWeekend 
      ? Math.floor(2000 + Math.random() * 6000)
      : Math.floor(4000 + Math.random() * 8000);
    
    const steps = Math.floor(baseSteps + (Math.random() - 0.5) * 2000);
    const distanceM = steps * 0.75; // ~0.75m per step
    const calories = steps * 0.04; // ~0.04 cal per step
    const goal = 8000;
    const goalMet = steps >= goal ? 1 : 0;
    
    const timestamp = new Date(date).getTime();
    
    await db.runAsync(
      `INSERT OR IGNORE INTO daily_steps (date, steps, distance_m, calories, goal, goal_met, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [date, steps, distanceM, calories, goal, goalMet, timestamp, timestamp]
    );
  }

  // ── Sleep ────────────────────────────────────────────────────────────────
  for (const date of dates) {
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Sleep duration: 5-9 hours, slightly more on weekends
    const baseDuration = isWeekend 
      ? 7 + Math.random() * 2
      : 6 + Math.random() * 2;
    
    const sessionDuration = Math.floor((baseDuration + (Math.random() - 0.5) * 0.5) * 60); // minutes
    const latencyMins = Math.floor(Math.random() * 20); // 0-20 min to fall asleep
    const actualDuration = sessionDuration - latencyMins;
    const goalMins = 420; // 7 hours
    const goalMet = actualDuration >= goalMins ? 1 : 0;
    
    const dateObj = new Date(date);
    const startTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 22, 30).getTime();
    const endTime = startTime + (sessionDuration * 60 * 1000);
    
    await db.runAsync(
      `INSERT OR IGNORE INTO sleep_sessions 
       (date, start_time, end_time, session_duration, latency_mins, actual_duration, goal_mins, goal_met, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [date, startTime, endTime, sessionDuration, latencyMins, actualDuration, goalMins, goalMet, startTime, endTime]
    );
  }

  // ── Water ────────────────────────────────────────────────────────────────
  // Create default containers if not exists
  const containers = [
    { name: 'Glass', capacity_ml: 250 },
    { name: 'Bottle', capacity_ml: 500 },
    { name: 'Tumbler', capacity_ml: 350 },
    { name: 'Jug', capacity_ml: 1000 },
  ];
  
  for (const container of containers) {
    await db.runAsync(
      `INSERT OR IGNORE INTO water_containers (name, capacity_ml, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [container.name, container.capacity_ml, 0, today, today]
    );
  }

  // Water logs for each day
  for (const date of dates) {
    const goalMl = 2400;
    // Total water: 1500-3000ml
    const totalMl = Math.floor(1500 + Math.random() * 1500);
    const goalMet = totalMl >= goalMl ? 1 : 0;
    
    // Create 3-6 logs per day
    const numLogs = 3 + Math.floor(Math.random() * 4);
    let runningTotal = 0;
    
    const dateObj = new Date(date);
    const dayStart = dateObj.getTime();
    
    for (let i = 0; i < numLogs; i++) {
      const container = containers[Math.floor(Math.random() * containers.length)];
      const logTime = dayStart + (i * 3 * 60 * 60 * 1000) + (Math.random() * 2 * 60 * 60 * 1000);
      runningTotal += container.capacity_ml;
      
      await db.runAsync(
        `INSERT INTO water_logs (date, logged_at, container_name, capacity_ml, running_total, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [date, logTime, container.name, container.capacity_ml, Math.min(runningTotal, totalMl), logTime]
      );
    }
    
    await db.runAsync(
      `INSERT OR IGNORE INTO water_daily_summary (date, total_ml, goal_ml, goal_met, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [date, totalMl, goalMl, goalMet, dayStart, dayStart]
    );
  }

  // ── Calories (Workouts) ──────────────────────────────────────────────────
  const intensities = ['light', 'moderate', 'intense'] as const;
  const workoutNotes = [
    'Morning run',
    'Gym session',
    'Leg day',
    'Cardio',
    'HIIT',
    'Cycling',
    'Swimming',
    'Yoga',
    'Basketball',
    'Football',
  ];

  // Add 1-2 workouts per week (random days)
  for (let i = 0; i < dates.length; i += 7) {
    const weekDates = dates.slice(i, i + 7);
    const numWorkouts = 1 + Math.floor(Math.random() * 2);
    
    for (let w = 0; w < numWorkouts; w++) {
      const date = weekDates[Math.floor(Math.random() * weekDates.length)];
      const intensity = intensities[Math.floor(Math.random() * intensities.length)];
      const durationMins = 15 + Math.floor(Math.random() * 60); // 15-75 min
      const weightKg = 70;
      
      // MET values
      const metValues = { light: 3.5, moderate: 6.0, intense: 10.0 };
      const calories = Math.round(metValues[intensity] * weightKg * (durationMins / 60));
      
      const note = Math.random() > 0.3 ? workoutNotes[Math.floor(Math.random() * workoutNotes.length)] : '';
      const logTime = new Date(date).getTime() + (8 * 60 * 60 * 1000); // 8 AM
      
      await db.runAsync(
        `INSERT INTO workout_logs (date, logged_at, duration_mins, intensity, calories, note, weight_kg_snap, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [date, logTime, durationMins, intensity, calories, note, weightKg, logTime, logTime]
      );
    }
  }

  // ── ABC ──────────────────────────────────────────────────────────────────
  for (const date of dates) {
    // 0-5 ABC logs per day
    const count = Math.floor(Math.random() * 6);
    
    const dateObj = new Date(date);
    const dayStart = dateObj.getTime();
    
    for (let i = 0; i < count; i++) {
      const logTime = dayStart + (i * 4 * 60 * 60 * 1000) + (Math.random() * 3 * 60 * 60 * 1000);
      
      await db.runAsync(
        `INSERT INTO abc_logs (date, logged_at, created_at)
         VALUES (?, ?, ?)`,
        [date, logTime, logTime]
      );
    }
    
    await db.runAsync(
      `INSERT OR IGNORE INTO abc_daily_summary (date, count, created_at, updated_at)
       VALUES (?, ?, ?, ?)`,
      [date, count, dayStart, dayStart]
    );
  }

  console.log('✅ Seeded 90 days of data across all features');
}

/**
 * Clear all data (for reset)
 */
export async function clearAllData(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('DELETE FROM daily_steps;');
  await db.execAsync('DELETE FROM sleep_sessions;');
  await db.execAsync('DELETE FROM water_logs;');
  await db.execAsync('DELETE FROM water_daily_summary;');
  await db.execAsync('DELETE FROM workout_logs;');
  await db.execAsync('DELETE FROM calories_daily_summary;');
  await db.execAsync('DELETE FROM abc_logs;');
  await db.execAsync('DELETE FROM abc_daily_summary;');
  
  console.log('✅ Cleared all data');
}
