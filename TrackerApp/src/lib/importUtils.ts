/**
 * Data import utilities for restoring backups
 */
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type { SQLiteDatabase } from 'expo-sqlite';

export interface ImportResult {
  success: boolean;
  message: string;
  itemsImported?: {
    steps?: number;
    sleep?: number;
    water?: number;
    calories?: number;
    abc?: number;
  };
}

export type ImportMode = 'merge' | 'replace';

/**
 * Pick a JSON backup file from device storage
 */
export async function pickBackupFile(): Promise<string | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0].uri;
  } catch (error) {
    console.error('[ImportUtils] File picker failed:', error);
    throw new Error('Failed to pick file');
  }
}

/**
 * Validate backup file structure
 */
function validateBackup(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (!d.backup_info && !d.export_info) return false;
  return true;
}

/**
 * Import full backup (restores everything)
 */
export async function importFullBackup(
  db: SQLiteDatabase,
  fileUri: string,
  mode: ImportMode = 'merge'
): Promise<ImportResult> {
  try {
    // Read file
    const fileContent = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const backup = JSON.parse(fileContent);

    // Validate
    if (!validateBackup(backup)) {
      throw new Error('Invalid backup file format');
    }

    const itemsImported = {
      steps: 0,
      sleep: 0,
      water: 0,
      calories: 0,
      abc: 0,
    };

    // Start transaction
    await db.execAsync('BEGIN TRANSACTION');

    try {
      // Clear existing data if replace mode
      if (mode === 'replace') {
        await db.execAsync('DELETE FROM daily_steps');
        await db.execAsync('DELETE FROM sleep_sessions WHERE is_active = 0');
        await db.execAsync('DELETE FROM water_logs');
        await db.execAsync('DELETE FROM water_daily_summary');
        await db.execAsync('DELETE FROM workout_logs');
        await db.execAsync('DELETE FROM calories_daily_summary');
        await db.execAsync('DELETE FROM abc_logs');
        await db.execAsync('DELETE FROM abc_daily_summary');
      }

      // Import Steps (handle both export and backup formats)
      const stepsData = backup.steps?.daily_data || backup.steps || [];
      if (Array.isArray(stepsData) && stepsData.length > 0) {
        for (const record of stepsData) {
          await db.runAsync(
            `INSERT OR REPLACE INTO daily_steps 
             (date, steps, distance_m, calories, goal, goal_met, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              record.date,
              record.steps || 0,
              record.distance_m || 0,
              record.calories || 0,
              record.goal || 8000,
              record.goal_met || 0,
              record.created_at || Date.now(),
              record.updated_at || Date.now(),
            ]
          );
          itemsImported.steps++;
        }
      }

      // Import Sleep (handle both export and backup formats)
      const sleepData = Array.isArray(backup.sleep) ? backup.sleep : [];
      if (sleepData.length > 0) {
        for (const record of sleepData) {
          if (record.is_active === 1) continue; // Skip active sessions

          // Include id so INSERT OR REPLACE can match on primary key and avoid duplicates
          await db.runAsync(
            `INSERT OR REPLACE INTO sleep_sessions 
             (id, date, start_time, end_time, session_duration, latency_mins, actual_duration, goal_mins, goal_met, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
            [
              record.id || null,
              record.date,
              record.start_time,
              record.end_time,
              record.session_duration,
              record.latency_mins || 0,
              record.actual_duration,
              record.goal_mins || 480,
              record.goal_met || 0,
              record.created_at || Date.now(),
              record.updated_at || Date.now(),
            ]
          );
          itemsImported.sleep++;
        }
      }

      // Import Water (handle both export and backup formats)
      const waterData = backup.water?.daily_summary || backup.water || [];
      if (Array.isArray(waterData) && waterData.length > 0) {
        for (const record of waterData) {
          await db.runAsync(
            `INSERT OR REPLACE INTO water_daily_summary 
             (date, total_ml, goal_ml, goal_met, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              record.date,
              record.total_ml || 0,
              record.goal_ml || 2400,
              record.goal_met || 0,
              record.created_at || Date.now(),
              record.updated_at || Date.now(),
            ]
          );
          itemsImported.water++;
        }
      }

      // Import individual water_logs from backup (full backup format only)
      const waterLogs = backup.water?.logs || [];
      if (Array.isArray(waterLogs) && waterLogs.length > 0) {
        for (const log of waterLogs) {
          await db.runAsync(
            `INSERT OR REPLACE INTO water_logs
             (id, date, logged_at, container_id, container_name, capacity_ml, running_total, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              log.id || null,
              log.date,
              log.logged_at || Date.now(),
              log.container_id || null,
              log.container_name || null,
              log.capacity_ml || 0,
              log.running_total || 0,
              log.created_at || Date.now(),
            ]
          );
        }
      }

      // Import Calories (handle both export and backup formats)
      const caloriesData = backup.calories?.daily_summary || backup.calories_summary || [];
      if (Array.isArray(caloriesData) && caloriesData.length > 0) {
        for (const record of caloriesData) {
          await db.runAsync(
            `INSERT OR REPLACE INTO calories_daily_summary 
             (date, walking_calories, workout_calories, total_calories, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              record.date,
              record.walking_calories || 0,
              record.workout_calories || 0,
              record.total_calories || 0,
              record.created_at || Date.now(),
              record.updated_at || Date.now(),
            ]
          );
          itemsImported.calories++;
        }
      }

      // Import workout_logs (present in export format)
      const workoutLogs = backup.workout_logs || backup.calories?.workout_logs || [];
      if (Array.isArray(workoutLogs) && workoutLogs.length > 0) {
        for (const record of workoutLogs) {
          await db.runAsync(
            `INSERT OR REPLACE INTO workout_logs
             (id, date, logged_at, duration_mins, intensity, calories, note, weight_kg_snap, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              record.id || null,
              record.date,
              record.logged_at || Date.now(),
              record.duration_mins || 0,
              record.intensity || 'moderate',
              record.calories || 0,
              record.note || '',
              record.weight_kg_snap || null,
              record.created_at || Date.now(),
              record.updated_at || Date.now(),
            ]
          );
          // Don't double-count: workout_logs are part of calories data,
          // itemsImported.calories already counted calories_daily_summary rows
        }
      }

      // Import ABC (handle both export and backup formats)
      const abcData = backup.abc?.daily_summary || backup.abc || [];
      if (Array.isArray(abcData) && abcData.length > 0) {
        // Build a lookup of real log timestamps from full backup if available
        const abcLogsByDate: Record<string, number[]> = {};
        const realAbcLogs = backup.abc?.logs || [];
        for (const log of realAbcLogs) {
          if (!abcLogsByDate[log.date]) abcLogsByDate[log.date] = [];
          abcLogsByDate[log.date].push(log.logged_at || log.created_at || Date.now());
        }

        for (const record of abcData) {
          await db.runAsync(
            `INSERT OR REPLACE INTO abc_daily_summary 
             (date, count, created_at, updated_at)
             VALUES (?, ?, ?, ?)`,
            [
              record.date,
              record.count || 0,
              record.created_at || Date.now(),
              record.updated_at || Date.now(),
            ]
          );

          // Sync abc_logs: use real timestamps from backup.abc.logs when available,
          // fall back to synthetic timestamps only when logs aren't present
          await db.runAsync('DELETE FROM abc_logs WHERE date = ?', [record.date]);
          const realTimestamps = abcLogsByDate[record.date] || [];
          const count = record.count || 0;
          for (let i = 0; i < count; i++) {
            const ts = realTimestamps[i] ?? (record.created_at || Date.now()) + i;
            await db.runAsync(
              'INSERT INTO abc_logs (date, logged_at, created_at) VALUES (?, ?, ?)',
              [record.date, ts, ts]
            );
          }

          itemsImported.abc++;
        }
      }

      // Commit transaction
      await db.execAsync('COMMIT');

      return {
        success: true,
        message: 'Backup restored successfully',
        itemsImported,
      };
    } catch (error) {
      // Rollback on error
      await db.execAsync('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('[ImportUtils] Import failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Import failed',
    };
  }
}

/**
 * Get backup file info without importing
 */
export async function getBackupInfo(fileUri: string): Promise<{
  isValid: boolean;
  type?: 'full_backup' | 'export';
  createdAt?: string;
  version?: string;
  itemCounts?: {
    steps?: number;
    sleep?: number;
    water?: number;
    calories?: number;
    abc?: number;
  };
}> {
  try {
    const fileContent = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const data = JSON.parse(fileContent);

    if (!validateBackup(data)) {
      return { isValid: false };
    }

    const itemCounts: { steps?: number; sleep?: number; water?: number; calories?: number; abc?: number } = {};
    
    // Handle both full backup format (data.steps.daily_data) and export format (data.steps flat array)
    const stepsData = data.steps?.daily_data || (Array.isArray(data.steps) ? data.steps : null);
    if (stepsData) itemCounts.steps = stepsData.length;

    if (data.sleep) itemCounts.sleep = Array.isArray(data.sleep) ? data.sleep.length : 0;

    // Handle both full backup format (data.water.daily_summary) and export format (data.water flat array)
    const waterData = data.water?.daily_summary || (Array.isArray(data.water) ? data.water : null);
    if (waterData) itemCounts.water = waterData.length;

    // Handle both full backup format (data.calories.daily_summary) and export format (data.calories_summary)
    const caloriesData = data.calories?.daily_summary || (Array.isArray(data.calories_summary) ? data.calories_summary : null);
    const workoutData = data.workout_logs || data.calories?.workout_logs;
    const caloriesCount = (caloriesData?.length || 0) + (Array.isArray(workoutData) ? workoutData.length : 0);
    if (caloriesCount > 0) itemCounts.calories = caloriesCount;

    // Handle both full backup format (data.abc.daily_summary) and export format (data.abc flat array)
    const abcData = data.abc?.daily_summary || (Array.isArray(data.abc) ? data.abc : null);
    if (abcData) itemCounts.abc = abcData.length;

    return {
      isValid: true,
      type: data.backup_info ? 'full_backup' : 'export',
      createdAt: data.backup_info?.created_at || data.export_info?.exported_at,
      version: data.backup_info?.version,
      itemCounts,
    };
  } catch (error) {
    console.error('[ImportUtils] Failed to read backup info:', error);
    return { isValid: false };
  }
}
