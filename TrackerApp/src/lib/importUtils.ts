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
function validateBackup(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  
  // Check for backup_info (full backup) or export_info (data export)
  if (!data.backup_info && !data.export_info) return false;
  
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
          
          await db.runAsync(
            `INSERT OR REPLACE INTO sleep_sessions 
             (date, start_time, end_time, session_duration, latency_mins, actual_duration, goal_mins, goal_met, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
            [
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

      // Import ABC (handle both export and backup formats)
      const abcData = backup.abc?.daily_summary || backup.abc || [];
      if (Array.isArray(abcData) && abcData.length > 0) {
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

    const itemCounts: any = {};
    
    if (data.steps?.daily_data) itemCounts.steps = data.steps.daily_data.length;
    if (data.sleep) itemCounts.sleep = Array.isArray(data.sleep) ? data.sleep.length : 0;
    if (data.water?.daily_summary) itemCounts.water = data.water.daily_summary.length;
    if (data.calories?.daily_summary) itemCounts.calories = data.calories.daily_summary.length;
    if (data.abc?.daily_summary) itemCounts.abc = data.abc.daily_summary.length;

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
