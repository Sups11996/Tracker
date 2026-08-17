/**
 * Tests for abcStore — logAbc, undoLastAbc, deleteAbcEntry
 */
import { useAbcStore, logAbc, undoLastAbc, deleteAbcEntry } from '../abcStore';

// ── Minimal DB mock ────────────────────────────────────────────────────────────
let nextId = 1;
let shouldFailOnSecondWrite = false;

function makeDb(options: { failSummary?: boolean } = {}) {
  let callCount = 0;
  return {
    async runAsync(sql: string, params: any[]) {
      callCount++;
      // Simulate DB failure on summary write (second write in logAbc)
      if (options.failSummary && callCount >= 2) {
        throw new Error('DB error');
      }
      return { lastInsertRowId: nextId++ };
    },
    async getFirstAsync() { return null; },
    async getAllAsync() { return []; },
    async execAsync() {},
  } as any;
}

beforeEach(() => {
  nextId = 1;
  jest.useFakeTimers();
  useAbcStore.setState({
    todayCount: 0,
    lastLoggedAt: null,
    yesterdayCount: 0,
    entries: [],
    dailyGoal: 3,
    undoStack: [],
    undoEntry: null,
    undoTimer: null,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

// ── logAbc ─────────────────────────────────────────────────────────────────────

test('logAbc increments todayCount', async () => {
  await logAbc(makeDb());
  expect(useAbcStore.getState().todayCount).toBe(1);
});

test('logAbc adds to entries and undoStack', async () => {
  await logAbc(makeDb());
  expect(useAbcStore.getState().entries).toHaveLength(1);
  expect(useAbcStore.getState().undoStack).toHaveLength(1);
  expect(useAbcStore.getState().undoStack[0].previousCount).toBe(0);
});

test('logAbc does NOT update store if DB summary write fails', async () => {
  await expect(logAbc(makeDb({ failSummary: true }))).rejects.toThrow();
  // Store should remain at 0 — both DB writes must succeed before store update
  expect(useAbcStore.getState().todayCount).toBe(0);
  expect(useAbcStore.getState().entries).toHaveLength(0);
});

test('logAbc called twice gives correct count', async () => {
  await logAbc(makeDb());
  await logAbc(makeDb());
  expect(useAbcStore.getState().todayCount).toBe(2);
});

// ── undoLastAbc ────────────────────────────────────────────────────────────────

test('undoLastAbc decrements todayCount back to previousCount', async () => {
  await logAbc(makeDb());
  await undoLastAbc(makeDb());
  expect(useAbcStore.getState().todayCount).toBe(0);
});

test('undoLastAbc clears undoStack and undoTimer when stack empty', async () => {
  await logAbc(makeDb());
  await undoLastAbc(makeDb());
  expect(useAbcStore.getState().undoStack).toHaveLength(0);
  expect(useAbcStore.getState().undoEntry).toBeNull();
  expect(useAbcStore.getState().undoTimer).toBeNull();
});

test('undoLastAbc does nothing when undoStack is empty', async () => {
  await undoLastAbc(makeDb()); // should not throw
  expect(useAbcStore.getState().todayCount).toBe(0);
});

// ── deleteAbcEntry ─────────────────────────────────────────────────────────────

test('deleteAbcEntry removes correct entry and updates count', async () => {
  await logAbc(makeDb());
  const entry = useAbcStore.getState().entries[0];
  await deleteAbcEntry(makeDb(), entry.id);
  expect(useAbcStore.getState().todayCount).toBe(0);
  expect(useAbcStore.getState().entries).toHaveLength(0);
});

test('deleteAbcEntry filters the deleted entry from undoStack', async () => {
  await logAbc(makeDb());
  const entry = useAbcStore.getState().entries[0];
  await deleteAbcEntry(makeDb(), entry.id);
  const stack = useAbcStore.getState().undoStack;
  expect(stack.every(u => u.logId !== entry.id)).toBe(true);
});
