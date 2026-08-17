/**
 * Tests for sleepStore — startSleepSession, endSleepSession, logManualSleep
 */
import { useSleepStore, endSleepSession, logManualSleep } from '../sleepStore';

// ── Minimal DB mock ────────────────────────────────────────────────────────────
let nextId = 1;
// Track which WHERE clause UPDATE ran against
let lastUpdateWhere: string = '';

function makeDb() {
  return {
    async runAsync(sql: string, params: any[]) {
      if (sql.includes('UPDATE') || sql.includes('update')) {
        // Capture the WHERE clause condition for assertion
        const whereMatch = sql.match(/WHERE\s+(.+)$/i);
        if (whereMatch) lastUpdateWhere = whereMatch[1].trim();
      }
      return { lastInsertRowId: nextId++ };
    },
    async getFirstAsync(sql: string) {
      if (sql.includes('kv_store')) return { value: '480' };
      if (sql.includes('sleep_sessions') && sql.includes('is_active = 1')) return null;
      return null;
    },
    async getAllAsync() { return []; },
    async execAsync() {},
  } as any;
}

beforeEach(() => {
  nextId = 1;
  lastUpdateWhere = '';
  useSleepStore.setState({
    isActive: true,
    sessionId: 1,
    sessionStartTime: Date.now() - 60 * 60 * 1000, // 1 hour ago
    elapsedMinutes: 60,
    lastNightDuration: null,
    lastNightQuality: null,
    recentSessions: [],
    goalMinutes: 480,
  });
});

// ── endSleepSession ────────────────────────────────────────────────────────────

test('endSleepSession scopes UPDATE to WHERE id = ? not WHERE is_active = 1', async () => {
  const db = makeDb();
  await endSleepSession(db, 10);
  expect(lastUpdateWhere).toMatch(/id\s*=\s*\?/i);
  expect(lastUpdateWhere).not.toMatch(/is_active\s*=\s*1/i);
});

test('endSleepSession clears isActive, sessionId and sessionStartTime', async () => {
  const db = makeDb();
  await endSleepSession(db, 0);
  const state = useSleepStore.getState();
  expect(state.isActive).toBe(false);
  expect(state.sessionId).toBeNull();
  expect(state.sessionStartTime).toBeNull();
  expect(state.elapsedMinutes).toBe(0);
});

test('endSleepSession throws when no active session in store', async () => {
  useSleepStore.setState({ isActive: false, sessionId: null, sessionStartTime: null });
  await expect(endSleepSession(makeDb(), 0)).rejects.toThrow('No active sleep session');
});

test('endSleepSession subtracts latency from actual duration', async () => {
  const startTime = Date.now() - 120 * 60 * 1000; // 2 hours ago
  useSleepStore.setState({ isActive: true, sessionId: 1, sessionStartTime: startTime });
  const db = makeDb();
  await endSleepSession(db, 30); // 30 min latency
  const state = useSleepStore.getState();
  // actual = ~120 - 30 = ~90 mins
  expect(state.lastNightDuration).toBeGreaterThanOrEqual(85);
  expect(state.lastNightDuration).toBeLessThanOrEqual(95);
});

// ── logManualSleep ─────────────────────────────────────────────────────────────

test('logManualSleep derives date from startTime timestamp', async () => {
  const db = makeDb();
  const start = new Date();
  start.setDate(start.getDate() - 1);
  start.setHours(22, 0, 0, 0);
  const end = new Date();
  end.setHours(6, 0, 0, 0);
  // Should not throw
  await expect(logManualSleep(db, 'night', start.getTime(), end.getTime())).resolves.toBeUndefined();
});

test('logManualSleep with nap type uses today date from startTime', async () => {
  const db = makeDb();
  const start = new Date();
  start.setHours(13, 0, 0, 0);
  const end = new Date();
  end.setHours(14, 0, 0, 0);
  await expect(logManualSleep(db, 'nap', start.getTime(), end.getTime())).resolves.toBeUndefined();
});
