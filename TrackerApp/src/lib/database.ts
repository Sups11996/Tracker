import * as SQLite from 'expo-sqlite';

export const DATABASE_NAME = 'tracker.db';

/**
 * Initialize the database and create all tables.
 * Called once from SQLiteProvider's onInit.
 */
export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // ── User Profile ────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id                  INTEGER PRIMARY KEY DEFAULT 1,
      username            TEXT NOT NULL,
      gender              TEXT NOT NULL DEFAULT 'male',
      age                 INTEGER NOT NULL DEFAULT 25,
      height_cm           REAL NOT NULL DEFAULT 170,
      weight_kg           REAL NOT NULL DEFAULT 70,
      water_goal_ml       INTEGER NOT NULL DEFAULT 2400,
      uses_gym            INTEGER NOT NULL DEFAULT 0,
      uses_abc            INTEGER NOT NULL DEFAULT 0,
      onboarding_complete INTEGER NOT NULL DEFAULT 0,
      created_at          TEXT NOT NULL,
      updated_at          TEXT NOT NULL
    );
  `);

  // ── KV Store (app settings, flags) ─────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // ── Steps ───────────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS daily_steps (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      date         TEXT NOT NULL UNIQUE,
      steps        INTEGER NOT NULL DEFAULT 0,
      distance_m   REAL NOT NULL DEFAULT 0,
      calories     REAL NOT NULL DEFAULT 0,
      goal         INTEGER NOT NULL DEFAULT 8000,
      goal_met     INTEGER NOT NULL DEFAULT 0,
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS step_tracking_state (
      id                      INTEGER PRIMARY KEY DEFAULT 1,
      is_tracking             INTEGER NOT NULL DEFAULT 1,
      is_paused               INTEGER NOT NULL DEFAULT 0,
      is_vehicle_mode         INTEGER NOT NULL DEFAULT 0,
      vehicle_mode_start_ts   INTEGER,
      last_sensor_step_count  INTEGER NOT NULL DEFAULT 0,
      session_start_steps     INTEGER NOT NULL DEFAULT 0,
      daily_goal              INTEGER NOT NULL DEFAULT 8000,
      updated_at              INTEGER NOT NULL
    );
  `);

  // ── Sleep ───────────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sleep_sessions (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      date             TEXT NOT NULL,
      start_time       INTEGER NOT NULL,
      end_time         INTEGER,
      session_duration INTEGER,
      latency_mins     INTEGER NOT NULL DEFAULT 0,
      actual_duration  INTEGER,
      goal_mins        INTEGER,
      goal_met         INTEGER NOT NULL DEFAULT 0,
      is_active        INTEGER NOT NULL DEFAULT 1,
      created_at       INTEGER NOT NULL,
      updated_at       INTEGER NOT NULL
    );
  `);

  // ── Water ───────────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS water_containers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      capacity_ml INTEGER NOT NULL,
      icon       TEXT,
      color      TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS water_logs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      date            TEXT NOT NULL,
      logged_at       INTEGER NOT NULL,
      container_id    INTEGER,
      container_name  TEXT NOT NULL,
      capacity_ml     INTEGER NOT NULL,
      running_total   INTEGER NOT NULL,
      created_at      INTEGER NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS water_daily_summary (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT NOT NULL UNIQUE,
      total_ml    INTEGER NOT NULL DEFAULT 0,
      goal_ml     INTEGER NOT NULL,
      goal_met    INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );
  `);

  // ── Calories ────────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_logs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      date            TEXT NOT NULL,
      logged_at       INTEGER NOT NULL,
      duration_mins   INTEGER NOT NULL,
      intensity       TEXT NOT NULL,
      calories        REAL NOT NULL,
      note            TEXT,
      weight_kg_snap  REAL NOT NULL,
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS calories_daily_summary (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      date             TEXT NOT NULL UNIQUE,
      walking_calories REAL NOT NULL DEFAULT 0,
      workout_calories REAL NOT NULL DEFAULT 0,
      total_calories   REAL NOT NULL DEFAULT 0,
      created_at       INTEGER NOT NULL,
      updated_at       INTEGER NOT NULL
    );
  `);

  // ── Screen Time (Disabled - feature not implemented) ───────────────────────
  // Uncomment if you want to implement screen time tracking in the future
  /*
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_usage_sessions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      date         TEXT NOT NULL,
      package_name TEXT NOT NULL,
      app_name     TEXT NOT NULL,
      start_time   INTEGER NOT NULL,
      end_time     INTEGER NOT NULL,
      duration_ms  INTEGER NOT NULL,
      created_at   INTEGER NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS screen_time_daily_summary (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      date             TEXT NOT NULL UNIQUE,
      total_screen_ms  INTEGER NOT NULL DEFAULT 0,
      unlock_count     INTEGER NOT NULL DEFAULT 0,
      top_app_package  TEXT,
      top_app_name     TEXT,
      top_app_duration INTEGER NOT NULL DEFAULT 0,
      created_at       INTEGER NOT NULL,
      updated_at       INTEGER NOT NULL
    );
  `);
  */
  // ── ABC ─────────────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS abc_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL,
      logged_at  INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS abc_daily_summary (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL UNIQUE,
      count      INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}
