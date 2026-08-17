/**
 * Tests for waterStore — logWater, undoLastLog, deleteWaterLog
 */
import { useWaterStore, logWater, undoLastLog, deleteWaterLog } from '../waterStore';

// ── Minimal DB mock ────────────────────────────────────────────────────────────
let nextId = 1;

function makeDb() {
  return {
    async runAsync(sql: string, params: any[]) {
      return { lastInsertRowId: nextId++ };
    },
    async getFirstAsync() { return null; },
    async getAllAsync() { return []; },
    async execAsync() {},
  } as any;
}

beforeEach(() => {
  nextId = 1;
  useWaterStore.setState({
    todayTotal: 0,
    dailyGoal: 2400,
    containers: [],
    logs: [],
    undoStack: [],
    undoTimer: null,
  });
});

const container = { id: 1, name: 'Bottle', capacity_ml: 500, sort_order: 0 };

// ── logWater ───────────────────────────────────────────────────────────────────

test('logWater increments todayTotal by container capacity', async () => {
  const db = makeDb();
  await logWater(db, container);
  expect(useWaterStore.getState().todayTotal).toBe(500);
});

test('logWater called twice gives correct cumulative total', async () => {
  const db = makeDb();
  await logWater(db, container);
  await logWater(db, container);
  expect(useWaterStore.getState().todayTotal).toBe(1000);
});

test('logWater adds entry to logs array', async () => {
  const db = makeDb();
  await logWater(db, container);
  expect(useWaterStore.getState().logs).toHaveLength(1);
  expect(useWaterStore.getState().logs[0].capacity_ml).toBe(500);
});

test('logWater adds entry to undoStack', async () => {
  const db = makeDb();
  await logWater(db, container);
  expect(useWaterStore.getState().undoStack).toHaveLength(1);
  expect(useWaterStore.getState().undoStack[0].previousTotal).toBe(0);
});

test('concurrent logWater calls produce correct total (lock serialises them)', async () => {
  const db = makeDb();
  // Fire two calls simultaneously — without the lock they'd both read todayTotal=0
  await Promise.all([logWater(db, container), logWater(db, container)]);
  expect(useWaterStore.getState().todayTotal).toBe(1000);
});

// ── undoLastLog ────────────────────────────────────────────────────────────────

test('undoLastLog removes the last log entry and restores total', async () => {
  const db = makeDb();
  await logWater(db, container);
  await undoLastLog(db);
  expect(useWaterStore.getState().todayTotal).toBe(0);
  expect(useWaterStore.getState().logs).toHaveLength(0);
});

test('undoLastLog clears undoTimer when stack becomes empty', async () => {
  const db = makeDb();
  await logWater(db, container);
  await undoLastLog(db);
  expect(useWaterStore.getState().undoTimer).toBeNull();
});

test('undoLastLog does nothing when undoStack is empty', async () => {
  const db = makeDb();
  await undoLastLog(db); // should not throw
  expect(useWaterStore.getState().todayTotal).toBe(0);
});
