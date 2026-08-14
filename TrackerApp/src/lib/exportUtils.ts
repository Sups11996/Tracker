/**
 * Data export utilities for CSV and JSON exports
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { formatDateLocal } from './dateUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ExportFormat = 'csv' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  includeSteps?: boolean;
  includeSleep?: boolean;
  includeWater?: boolean;
  includeCalories?: boolean;
  includeABC?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV Formatters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(data: any[], headers: string[]): string {
  if (data.length === 0) {
    return headers.join(',') + '\n';
  }

  const headerRow = headers.join(',');
  const rows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Escape commas and quotes in values
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  return headerRow + '\n' + rows.join('\n');
}

/**
 * Format timestamp to readable datetime string
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', { 
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Export Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export steps data
 */
async function exportSteps(db: SQLiteDatabase, startDate: string, endDate: string): Promise<string> {
  const data = await db.getAllAsync<any>(
    `SELECT date, steps, distance_m as distance_meters, calories, goal, goal_met
     FROM daily_steps
     WHERE date >= ? AND date <= ?
     ORDER BY date ASC`,
    [startDate, endDate]
  );

  return arrayToCSV(data, ['date', 'steps', 'distance_meters', 'calories', 'goal', 'goal_met']);
}

/**
 * Export sleep data
 */
async function exportSleep(db: SQLiteDatabase, startDate: string, endDate: string): Promise<string> {
  const data = await db.getAllAsync<any>(
    `SELECT date, start_time, end_time, session_duration as duration_mins, 
            latency_mins, actual_duration as actual_duration_mins, 
            goal_mins, goal_met
     FROM sleep_sessions
     WHERE date >= ? AND date <= ? AND is_active = 0
     ORDER BY date ASC`,
    [startDate, endDate]
  );

  // Format timestamps to readable dates
  const formatted = data.map(row => ({
    ...row,
    start_time: row.start_time ? formatTimestamp(row.start_time) : '',
    end_time: row.end_time ? formatTimestamp(row.end_time) : '',
  }));

  return arrayToCSV(formatted, [
    'date', 'start_time', 'end_time', 'duration_mins', 
    'latency_mins', 'actual_duration_mins', 'goal_mins', 'goal_met'
  ]);
}

/**
 * Export water data
 */
async function exportWater(db: SQLiteDatabase, startDate: string, endDate: string): Promise<string> {
  const data = await db.getAllAsync<any>(
    `SELECT date, total_ml, goal_ml, goal_met
     FROM water_daily_summary
     WHERE date >= ? AND date <= ?
     ORDER BY date ASC`,
    [startDate, endDate]
  );

  return arrayToCSV(data, ['date', 'total_ml', 'goal_ml', 'goal_met']);
}

/**
 * Export calories data
 */
async function exportCalories(db: SQLiteDatabase, startDate: string, endDate: string): Promise<string> {
  const data = await db.getAllAsync<any>(
    `SELECT date, walking_calories, workout_calories, total_calories
     FROM calories_daily_summary
     WHERE date >= ? AND date <= ?
     ORDER BY date ASC`,
    [startDate, endDate]
  );

  return arrayToCSV(data, ['date', 'walking_calories', 'workout_calories', 'total_calories']);
}

/**
 * Export ABC data
 */
async function exportABC(db: SQLiteDatabase, startDate: string, endDate: string): Promise<string> {
  const data = await db.getAllAsync<any>(
    `SELECT date, count
     FROM abc_daily_summary
     WHERE date >= ? AND date <= ?
     ORDER BY date ASC`,
    [startDate, endDate]
  );

  return arrayToCSV(data, ['date', 'count']);
}

/**
 * Export workout logs (detailed calories data)
 */
async function exportWorkoutLogs(db: SQLiteDatabase, startDate: string, endDate: string): Promise<string> {
  const data = await db.getAllAsync<any>(
    `SELECT date, logged_at, duration_mins, intensity, calories, note, weight_kg_snap
     FROM workout_logs
     WHERE date >= ? AND date <= ?
     ORDER BY date ASC, logged_at ASC`,
    [startDate, endDate]
  );

  // Format timestamps
  const formatted = data.map(row => ({
    ...row,
    logged_at: formatTimestamp(row.logged_at),
  }));

  return arrayToCSV(formatted, ['date', 'logged_at', 'duration_mins', 'intensity', 'calories', 'note', 'weight_kg_snap']);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export tracker data to CSV or JSON format
 * Saves directly to Downloads folder on Android
 */
export async function exportData(db: SQLiteDatabase, options: ExportOptions, username?: string): Promise<void> {
  const { format, startDate, endDate } = options;
  
  try {
    let fileContent = '';
    
    // Generate filename with username and timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const userPrefix = username ? `${username}_` : '';
    const fileName = `${userPrefix}tracker_${timestamp}.${format === 'csv' ? 'csv' : 'json'}`;

    if (format === 'csv') {
      // Build combined CSV with sections
      const sections: string[] = [];
      
      if (options.includeSteps) {
        const stepsCSV = await exportSteps(db, startDate, endDate);
        sections.push('# STEPS DATA\n' + stepsCSV);
      }

      if (options.includeSleep) {
        const sleepCSV = await exportSleep(db, startDate, endDate);
        sections.push('# SLEEP DATA\n' + sleepCSV);
      }

      if (options.includeWater) {
        const waterCSV = await exportWater(db, startDate, endDate);
        sections.push('# WATER DATA\n' + waterCSV);
      }

      if (options.includeCalories) {
        const caloriesCSV = await exportCalories(db, startDate, endDate);
        sections.push('# CALORIES SUMMARY\n' + caloriesCSV);
        
        // Also export detailed workout logs
        const workoutCSV = await exportWorkoutLogs(db, startDate, endDate);
        if (workoutCSV.split('\n').length > 2) { // Has data beyond header
          sections.push('# WORKOUT LOGS (DETAILED)\n' + workoutCSV);
        }
      }

      if (options.includeABC) {
        const abcCSV = await exportABC(db, startDate, endDate);
        sections.push('# ABC TRACKING DATA\n' + abcCSV);
      }

      fileContent = sections.join('\n\n');
    } else {
      // JSON export
      const exportData: any = {
        export_info: {
          date_range: { start: startDate, end: endDate },
          exported_at: new Date().toISOString(),
          format: 'json'
        }
      };

      if (options.includeSteps) {
        const stepsData = await db.getAllAsync<any>(
          `SELECT * FROM daily_steps WHERE date >= ? AND date <= ? ORDER BY date ASC`,
          [startDate, endDate]
        );
        exportData.steps = stepsData;
      }

      if (options.includeSleep) {
        const sleepData = await db.getAllAsync<any>(
          `SELECT * FROM sleep_sessions WHERE date >= ? AND date <= ? AND is_active = 0 ORDER BY date ASC`,
          [startDate, endDate]
        );
        exportData.sleep = sleepData;
      }

      if (options.includeWater) {
        const waterData = await db.getAllAsync<any>(
          `SELECT * FROM water_daily_summary WHERE date >= ? AND date <= ? ORDER BY date ASC`,
          [startDate, endDate]
        );
        exportData.water = waterData;
      }

      if (options.includeCalories) {
        const caloriesData = await db.getAllAsync<any>(
          `SELECT * FROM calories_daily_summary WHERE date >= ? AND date <= ? ORDER BY date ASC`,
          [startDate, endDate]
        );
        const workoutsData = await db.getAllAsync<any>(
          `SELECT * FROM workout_logs WHERE date >= ? AND date <= ? ORDER BY date ASC, logged_at ASC`,
          [startDate, endDate]
        );
        exportData.calories_summary = caloriesData;
        exportData.workout_logs = workoutsData;
      }

      if (options.includeABC) {
        const abcData = await db.getAllAsync<any>(
          `SELECT * FROM abc_daily_summary WHERE date >= ? AND date <= ? ORDER BY date ASC`,
          [startDate, endDate]
        );
        exportData.abc = abcData;
      }

      fileContent = JSON.stringify(exportData, null, 2);
    }

    // Create file in app storage first
    const trackerDir = FileSystem.documentDirectory + 'Tracker/';
    const dirInfo = await FileSystem.getInfoAsync(trackerDir);
    
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(trackerDir, { intermediates: true });
    }
    
    const tempFileUri = trackerDir + fileName;
    await FileSystem.writeAsStringAsync(tempFileUri, fileContent, {
      encoding: FileSystem.EncodingType.UTF8
    });

    // On Android, use SAF to let user pick location and save there
    if (Platform.OS === 'android') {
      try {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        
        if (permissions.granted) {
          const uri = permissions.directoryUri;
          
          // Create file in user-selected directory
          const safFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            uri,
            fileName,
            format === 'csv' ? 'text/csv' : 'application/json'
          );
          
          // Copy content to the new location
          await FileSystem.StorageAccessFramework.writeAsStringAsync(
            safFileUri,
            fileContent,
            { encoding: FileSystem.EncodingType.UTF8 }
          );
          
          return; // Success - file saved to user's location
        } else {
          // User cancelled picker - file still in app storage
          throw new Error('Save cancelled');
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Save cancelled') {
          throw error;
        }
        console.error('[ExportUtils] SAF save failed:', error);
        throw new Error('Could not save to selected location');
      }
    }

    // iOS: use share sheet
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(tempFileUri, {
        mimeType: format === 'csv' ? 'text/csv' : 'application/json',
        dialogTitle: 'Save Export File',
        UTI: format === 'csv' ? 'public.comma-separated-values-text' : 'public.json'
      });
    }
  } catch (error) {
    console.error('[ExportUtils] Export failed:', error);
    throw error;
  }
}

/**
 * Full database backup including all data and settings
 * Exports everything to a timestamped JSON file
 */
export async function createFullBackup(db: SQLiteDatabase, username?: string): Promise<void> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const userPrefix = username ? `${username}_` : '';
    const fileName = `${userPrefix}tracker_backup_${timestamp}.json`;

    // Export all data without date filtering
    const backup: any = {
      backup_info: {
        version: '1.3.0',
        created_at: new Date().toISOString(),
        type: 'full_backup'
      }
    };

    // User profile and settings
    const profile = await db.getFirstAsync<any>('SELECT * FROM user_profile WHERE id = 1');
    backup.user_profile = profile;

    // KV Store (app settings)
    const kvStore = await db.getAllAsync<any>('SELECT * FROM kv_store');
    backup.settings = kvStore;

    // All steps data
    const stepsData = await db.getAllAsync<any>('SELECT * FROM daily_steps ORDER BY date ASC');
    const stepsState = await db.getFirstAsync<any>('SELECT * FROM step_tracking_state WHERE id = 1');
    backup.steps = {
      daily_data: stepsData,
      tracking_state: stepsState
    };

    // All sleep data
    const sleepData = await db.getAllAsync<any>('SELECT * FROM sleep_sessions WHERE is_active = 0 ORDER BY date ASC');
    backup.sleep = sleepData;

    // All water data
    const waterContainers = await db.getAllAsync<any>('SELECT * FROM water_containers WHERE is_deleted = 0 ORDER BY sort_order ASC');
    const waterLogs = await db.getAllAsync<any>('SELECT * FROM water_logs ORDER BY date ASC, logged_at ASC');
    const waterSummary = await db.getAllAsync<any>('SELECT * FROM water_daily_summary ORDER BY date ASC');
    backup.water = {
      containers: waterContainers,
      logs: waterLogs,
      daily_summary: waterSummary
    };

    // All calories data
    const workoutLogs = await db.getAllAsync<any>('SELECT * FROM workout_logs ORDER BY date ASC, logged_at ASC');
    const caloriesSummary = await db.getAllAsync<any>('SELECT * FROM calories_daily_summary ORDER BY date ASC');
    backup.calories = {
      workout_logs: workoutLogs,
      daily_summary: caloriesSummary
    };

    // All ABC data
    const abcLogs = await db.getAllAsync<any>('SELECT * FROM abc_logs ORDER BY date ASC, logged_at ASC');
    const abcSummary = await db.getAllAsync<any>('SELECT * FROM abc_daily_summary ORDER BY date ASC');
    backup.abc = {
      logs: abcLogs,
      daily_summary: abcSummary
    };

    // Create file in app storage first
    const trackerDir = FileSystem.documentDirectory + 'Tracker/';
    const dirInfo = await FileSystem.getInfoAsync(trackerDir);
    
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(trackerDir, { intermediates: true });
    }
    
    const tempFileUri = trackerDir + fileName;
    const backupContent = JSON.stringify(backup, null, 2);
    await FileSystem.writeAsStringAsync(tempFileUri, backupContent, {
      encoding: FileSystem.EncodingType.UTF8
    });

    // On Android, use SAF to let user pick location and save there
    if (Platform.OS === 'android') {
      try {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        
        if (permissions.granted) {
          const uri = permissions.directoryUri;
          
          // Create file in user-selected directory
          const safFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            uri,
            fileName,
            'application/json'
          );
          
          // Copy content to the new location
          await FileSystem.StorageAccessFramework.writeAsStringAsync(
            safFileUri,
            backupContent,
            { encoding: FileSystem.EncodingType.UTF8 }
          );
          
          return; // Success - file saved to user's location
        } else {
          // User cancelled picker - file still in app storage
          throw new Error('Save cancelled');
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Save cancelled') {
          throw error;
        }
        console.error('[ExportUtils] SAF save failed:', error);
        throw new Error('Could not save to selected location');
      }
    }

    // iOS: use share sheet
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(tempFileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Save Backup File',
        UTI: 'public.json'
      });
    }
  } catch (error) {
    console.error('[ExportUtils] Backup failed:', error);
    throw error;
  }
}

/**
 * Quick export presets
 */
export const ExportPresets = {
  /**
   * Export last 7 days, all categories
   */
  lastWeek: (endDate: string): ExportOptions => {
    const end = new Date(endDate);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    
    return {
      format: 'csv',
      startDate: formatDateLocal(start),
      endDate: endDate,
      includeSteps: true,
      includeSleep: true,
      includeWater: true,
      includeCalories: true,
      includeABC: true,
    };
  },

  /**
   * Export last 30 days, all categories
   */
  lastMonth: (endDate: string): ExportOptions => {
    const end = new Date(endDate);
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    
    return {
      format: 'csv',
      startDate: formatDateLocal(start),
      endDate: endDate,
      includeSteps: true,
      includeSleep: true,
      includeWater: true,
      includeCalories: true,
      includeABC: true,
    };
  },

  /**
   * Export all time, all categories
   */
  allTime: (startDate: string, endDate: string): ExportOptions => {
    return {
      format: 'csv',
      startDate: startDate,
      endDate: endDate,
      includeSteps: true,
      includeSleep: true,
      includeWater: true,
      includeCalories: true,
      includeABC: true,
    };
  }
};
