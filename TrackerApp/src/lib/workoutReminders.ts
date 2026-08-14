import * as Notifications from 'expo-notifications';
import * as SQLite from 'expo-sqlite';

export interface WorkoutReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

const DEFAULT_SETTINGS: WorkoutReminderSettings = {
  enabled: false,
  hour: 18, // 6:00 PM
  minute: 0,
};

const WORKOUT_NOTIFICATION_ID = 'workout_reminder';

export async function loadWorkoutReminderSettings(
  db: SQLite.SQLiteDatabase
): Promise<WorkoutReminderSettings> {
  try {
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      `SELECT key, value FROM kv_store WHERE key LIKE 'workout_reminder_%'`
    );

    const settings = { ...DEFAULT_SETTINGS };
    rows.forEach((row) => {
      switch (row.key) {
        case 'workout_reminder_enabled':
          settings.enabled = row.value === '1';
          break;
        case 'workout_reminder_hour':
          settings.hour = parseInt(row.value, 10);
          break;
        case 'workout_reminder_minute':
          settings.minute = parseInt(row.value, 10);
          break;
      }
    });

    return settings;
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
}

export async function saveWorkoutReminderSettings(
  db: SQLite.SQLiteDatabase,
  settings: WorkoutReminderSettings
): Promise<void> {
  try {
    await db.runAsync(
      'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
      ['workout_reminder_enabled', settings.enabled ? '1' : '0']
    );
    await db.runAsync(
      'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
      ['workout_reminder_hour', settings.hour.toString()]
    );
    await db.runAsync(
      'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
      ['workout_reminder_minute', settings.minute.toString()]
    );
  } catch (error) {
    console.error('[WorkoutReminders] Save settings failed:', error);
    throw new Error('Failed to save workout reminder settings');
  }
}

export async function applyWorkoutReminderSettings(
  settings: WorkoutReminderSettings
): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(WORKOUT_NOTIFICATION_ID);
    if (!settings.enabled) return;

    // @ts-ignore - expo-notifications API version compatibility
  await Notifications.scheduleNotificationAsync({
      identifier: WORKOUT_NOTIFICATION_ID,
      content: {
        title: 'Workout time!',
        body: "Don't forget to log today's workout.",
        sound: true,
        // @ts-ignore
        android: { channelId: 'default', smallIcon: 'ic_notification' },
      },
      // @ts-ignore
      trigger: {
        type: 'daily',
        hour: settings.hour,
        minute: settings.minute,
        repeats: true,
      },
    });
  } catch (error) {
    console.error('[WorkoutReminders] Apply settings failed:', error);
    throw new Error('Failed to apply workout reminder settings');
  }
}
