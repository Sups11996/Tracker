import * as Notifications from 'expo-notifications';
import * as SQLite from 'expo-sqlite';

export interface SleepReminderSettings {
  bedtimeEnabled: boolean;
  bedtimeHour: number;
  bedtimeMinute: number;
  wakeEnabled: boolean;
  wakeHour: number;
  wakeMinute: number;
}

const DEFAULT_SETTINGS: SleepReminderSettings = {
  bedtimeEnabled: false,
  bedtimeHour: 22, // 10:00 PM
  bedtimeMinute: 0,
  wakeEnabled: false,
  wakeHour: 7, // 7:00 AM
  wakeMinute: 0,
};

const BEDTIME_NOTIFICATION_ID = 'sleep_bedtime_reminder';
const WAKE_NOTIFICATION_ID = 'sleep_wake_reminder';

export async function loadSleepReminderSettings(
  db: SQLite.SQLiteDatabase
): Promise<SleepReminderSettings> {
  try {
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      `SELECT key, value FROM kv_store WHERE key LIKE 'sleep_reminder_%'`
    );

    const settings = { ...DEFAULT_SETTINGS };
    
    rows.forEach((row) => {
      switch (row.key) {
        case 'sleep_reminder_bedtime_enabled':
          settings.bedtimeEnabled = row.value === '1';
          break;
        case 'sleep_reminder_bedtime_hour':
          settings.bedtimeHour = parseInt(row.value, 10);
          break;
        case 'sleep_reminder_bedtime_minute':
          settings.bedtimeMinute = parseInt(row.value, 10);
          break;
        case 'sleep_reminder_wake_enabled':
          settings.wakeEnabled = row.value === '1';
          break;
        case 'sleep_reminder_wake_hour':
          settings.wakeHour = parseInt(row.value, 10);
          break;
        case 'sleep_reminder_wake_minute':
          settings.wakeMinute = parseInt(row.value, 10);
          break;
      }
    });

    return settings;
  } catch (error) {
    console.error('[SleepReminders] Load settings failed:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSleepReminderSettings(
  db: SQLite.SQLiteDatabase,
  settings: SleepReminderSettings
): Promise<void> {
  try {
    // Use individual INSERT statements instead of execAsync to ensure proper persistence
    await db.runAsync(
      'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
      ['sleep_reminder_bedtime_enabled', settings.bedtimeEnabled ? '1' : '0']
    );
    await db.runAsync(
      'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
      ['sleep_reminder_bedtime_hour', settings.bedtimeHour.toString()]
    );
    await db.runAsync(
      'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
      ['sleep_reminder_bedtime_minute', settings.bedtimeMinute.toString()]
    );
    await db.runAsync(
      'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
      ['sleep_reminder_wake_enabled', settings.wakeEnabled ? '1' : '0']
    );
    await db.runAsync(
      'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
      ['sleep_reminder_wake_hour', settings.wakeHour.toString()]
    );
    await db.runAsync(
      'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
      ['sleep_reminder_wake_minute', settings.wakeMinute.toString()]
    );
  } catch (error) {
    console.error('[SleepReminders] Save settings failed:', error);
    throw new Error('Failed to save sleep reminder settings');
  }
}

/**
 * Schedule bedtime reminder notification
 */
export async function scheduleBedtimeReminder(
  hour: number,
  minute: number
): Promise<void> {
  try {
    // Cancel existing
    await Notifications.cancelScheduledNotificationAsync(BEDTIME_NOTIFICATION_ID);

    // Calculate next occurrence
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hour, minute, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    // Schedule notification
    // @ts-ignore - expo-notifications API version compatibility
    await Notifications.scheduleNotificationAsync({
      identifier: BEDTIME_NOTIFICATION_ID,
      content: {
        title: 'Time for bed',
        body: 'Start tracking your sleep to maintain healthy sleep habits.',
        sound: true,
        // @ts-ignore
        android: { channelId: 'default', smallIcon: 'ic_notification' },
      },
      // @ts-ignore
      trigger: {
        type: 'daily',
        hour,
        minute,
        repeats: true,
      },
    });
  } catch (error) {
    console.error('[SleepReminders] Schedule bedtime reminder failed:', error);
    throw new Error('Failed to schedule bedtime reminder');
  }
}

/**
 * Schedule wake reminder notification
 */
export async function scheduleWakeReminder(
  hour: number,
  minute: number
): Promise<void> {
  try {
    // Cancel existing
    await Notifications.cancelScheduledNotificationAsync(WAKE_NOTIFICATION_ID);

    // Calculate next occurrence
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hour, minute, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    // Schedule notification
    // @ts-ignore - expo-notifications API version compatibility
    await Notifications.scheduleNotificationAsync({
      identifier: WAKE_NOTIFICATION_ID,
      content: {
        title: 'Good morning!',
        body: 'Don\'t forget to log your sleep to track your rest.',
        sound: true,
        // @ts-ignore
        android: { channelId: 'default', smallIcon: 'ic_notification' },
      },
      // @ts-ignore
      trigger: {
        type: 'daily',
        hour,
        minute,
        repeats: true,
      },
    });
  } catch (error) {
    console.error('[SleepReminders] Schedule wake reminder failed:', error);
    throw new Error('Failed to schedule wake reminder');
  }
}

/**
 * Cancel bedtime reminder
 */
export async function cancelBedtimeReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(BEDTIME_NOTIFICATION_ID);
  } catch (error) {
    console.error('[SleepReminders] Cancel bedtime reminder failed:', error);
    // Don't throw - not critical if cancel fails
  }
}

/**
 * Cancel wake reminder
 */
export async function cancelWakeReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(WAKE_NOTIFICATION_ID);
  } catch (error) {
    console.error('[SleepReminders] Cancel wake reminder failed:', error);
    // Don't throw - not critical if cancel fails
  }
}

/**
 * Apply current settings - schedule/cancel reminders as needed
 */
export async function applySleepReminderSettings(
  settings: SleepReminderSettings
): Promise<void> {
  // Bedtime reminder
  if (settings.bedtimeEnabled) {
    await scheduleBedtimeReminder(settings.bedtimeHour, settings.bedtimeMinute);
  } else {
    await cancelBedtimeReminder();
  }

  // Wake reminder
  if (settings.wakeEnabled) {
    await scheduleWakeReminder(settings.wakeHour, settings.wakeMinute);
  } else {
    await cancelWakeReminder();
  }
}
