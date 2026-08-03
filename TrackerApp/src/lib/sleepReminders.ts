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

/**
 * Load sleep reminder settings from database
 */
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
    console.error('Failed to load sleep reminder settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save sleep reminder settings to database
 */
export async function saveSleepReminderSettings(
  db: SQLite.SQLiteDatabase,
  settings: SleepReminderSettings
): Promise<void> {
  try {
    await db.execAsync(`
      INSERT OR REPLACE INTO kv_store (key, value) VALUES
        ('sleep_reminder_bedtime_enabled', '${settings.bedtimeEnabled ? '1' : '0'}'),
        ('sleep_reminder_bedtime_hour', '${settings.bedtimeHour}'),
        ('sleep_reminder_bedtime_minute', '${settings.bedtimeMinute}'),
        ('sleep_reminder_wake_enabled', '${settings.wakeEnabled ? '1' : '0'}'),
        ('sleep_reminder_wake_hour', '${settings.wakeHour}'),
        ('sleep_reminder_wake_minute', '${settings.wakeMinute}');
    `);
  } catch (error) {
    console.error('Failed to save sleep reminder settings:', error);
    throw error;
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

    // Schedule new daily notification
    await Notifications.scheduleNotificationAsync({
      identifier: BEDTIME_NOTIFICATION_ID,
      content: {
        title: '🌙 Time for bed',
        body: 'Start tracking your sleep to maintain healthy sleep habits.',
        sound: true,
      },
      trigger: {
        type: 'calendar',
        hour,
        minute,
        repeats: true,
      },
    });

    console.log(`✅ Bedtime reminder scheduled for ${hour}:${minute.toString().padStart(2, '0')}`);
  } catch (error) {
    console.error('Failed to schedule bedtime reminder:', error);
    throw error;
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

    // Schedule new daily notification
    await Notifications.scheduleNotificationAsync({
      identifier: WAKE_NOTIFICATION_ID,
      content: {
        title: '☀️ Good morning!',
        body: 'Don\'t forget to log your sleep to track your rest.',
        sound: true,
      },
      trigger: {
        type: 'calendar',
        hour,
        minute,
        repeats: true,
      },
    });

    console.log(`✅ Wake reminder scheduled for ${hour}:${minute.toString().padStart(2, '0')}`);
  } catch (error) {
    console.error('Failed to schedule wake reminder:', error);
    throw error;
  }
}

/**
 * Cancel bedtime reminder
 */
export async function cancelBedtimeReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(BEDTIME_NOTIFICATION_ID);
    console.log('❌ Bedtime reminder cancelled');
  } catch (error) {
    console.error('Failed to cancel bedtime reminder:', error);
  }
}

/**
 * Cancel wake reminder
 */
export async function cancelWakeReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(WAKE_NOTIFICATION_ID);
    console.log('❌ Wake reminder cancelled');
  } catch (error) {
    console.error('Failed to cancel wake reminder:', error);
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
