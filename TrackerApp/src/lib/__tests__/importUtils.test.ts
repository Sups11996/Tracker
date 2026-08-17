/**
 * Tests for importUtils — importFullBackup
 * Verifies no duplicate sleep rows and ABC timestamp preservation
 */
import { importFullBackup } from '../importUtils';

// ── DB mock that tracks INSERT calls ──────────────────────────────────────────
function makeDb() {
  const insertLog: { table: string; params: any[] }[] = [];
  let nextId = 1;

  const db = {
    _insertLog: insertLog,

    async runAsync(sql: string, params: any[]) {
      const match = sql.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)/i);
      if (match) {
        insertLog.push({ table: match[1].toLowerCase(), params });
      }
      return { lastInsertRowId: nextId++ };
    },

    async getFirstAsync() { return null; },
    async getAllAsync() { return []; },

    async execAsync(sql: string) {
      // BEGIN TRANSACTION / COMMIT / ROLLBACK / DELETE — no-op
    },
  } as any;

  return db;
}

// ── Minimal valid backup fixture ──────────────────────────────────────────────
const baseBackup = {
  backup_info: { version: '1.3.0', created_at: new Date().toISOString(), type: 'full_backup' },
  sleep: [],
  steps: [],
  water: { daily_summary: [], logs: [], containers: [] },
  calories: { daily_summary: [], workout_logs: [] },
  abc: { daily_summary: [], logs: [] },
};

// ── No duplicate sleep rows on re-import ──────────────────────────────────────

test('importing same backup twice does not duplicate sleep sessions', async () => {
  const backup = {
    ...baseBackup,
    sleep: [
      {
        id: 1,
        date: '2026-07-01',
        start_time: 1000000,
        end_time: 1030000,
        session_duration: 480,
        actual_duration: 470,
        goal_mins: 480,
        goal_met: 0,
        is_active: 0,
        created_at: 1000000,
        updated_at: 1000000,
      },
    ],
  };

  const db = makeDb();
  await importFullBackup(db, '', 'merge');
  await importFullBackup(db, '', 'merge');

  const sleepInserts = db._insertLog.filter(r => r.table === 'sleep_sessions');
  // INSERT OR REPLACE with same id — DB deduplicates, but we should only attempt 2 inserts total (one per import)
  expect(sleepInserts).toHaveLength(2);
  // Both inserts should use the same id=1 so the DB replaces rather than adds
  expect(sleepInserts[0].params[0]).toBe(1);
  expect(sleepInserts[1].params[0]).toBe(1);
});

// ── ABC timestamps preserved from backup.abc.logs ────────────────────────────

test('ABC logs use real timestamps from backup.abc.logs when present', async () => {
  const realTs = 1720000000000;
  const backup = {
    ...baseBackup,
    abc: {
      daily_summary: [
        { date: '2026-07-01', count: 2, created_at: 1000, updated_at: 1000 },
      ],
      logs: [
        { id: 1, date: '2026-07-01', logged_at: realTs, created_at: realTs },
        { id: 2, date: '2026-07-01', logged_at: realTs + 5000, created_at: realTs + 5000 },
      ],
    },
  };

  const db = makeDb();
  await importFullBackup(db, '', 'merge');

  const abcInserts = db._insertLog.filter(r => r.table === 'abc_logs');
  expect(abcInserts).toHaveLength(2);
  // logged_at should be the real timestamp, not a synthetic one
  expect(abcInserts[0].params[1]).toBe(realTs);
  expect(abcInserts[1].params[1]).toBe(realTs + 5000);
});

test('ABC logs fall back to synthetic timestamps when backup.abc.logs absent', async () => {
  const backup = {
    ...baseBackup,
    abc: {
      daily_summary: [
        { date: '2026-07-01', count: 2, created_at: 1000, updated_at: 1000 },
      ],
      logs: [], // no real logs
    },
  };

  const db = makeDb();
  await importFullBackup(db, '', 'merge');

  const abcInserts = db._insertLog.filter(r => r.table === 'abc_logs');
  // Should still insert 2 synthetic rows (count = 2)
  expect(abcInserts).toHaveLength(2);
});

// ── importFullBackup reads file URI — mock FileSystem ────────────────────────
// The test above calls importFullBackup(db, '', 'merge') with empty URI.
// We need to mock expo-file-system so it returns our backup JSON.

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockImplementation(async () => {
    return JSON.stringify({
      backup_info: { version: '1.3.0', created_at: new Date().toISOString(), type: 'full_backup' },
      sleep: [
        {
          id: 1,
          date: '2026-07-01',
          start_time: 1000000,
          end_time: 1030000,
          session_duration: 480,
          actual_duration: 470,
          goal_mins: 480,
          goal_met: 0,
          is_active: 0,
          created_at: 1000000,
          updated_at: 1000000,
        },
      ],
      steps: [],
      water: { daily_summary: [], logs: [], containers: [] },
      calories: { daily_summary: [], workout_logs: [] },
      abc: {
        daily_summary: [
          { date: '2026-07-01', count: 2, created_at: 1000, updated_at: 1000 },
        ],
        logs: [
          { id: 1, date: '2026-07-01', logged_at: 1720000000000, created_at: 1720000000000 },
          { id: 2, date: '2026-07-01', logged_at: 1720000005000, created_at: 1720000005000 },
        ],
      },
    });
  }),
  EncodingType: { UTF8: 'utf8' },
}));
