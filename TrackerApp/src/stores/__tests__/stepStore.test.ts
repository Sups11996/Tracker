import { useStepStore, hydrateStepStore, saveStepData } from '../stepStore';
import { getTodayLocal } from '../../lib/dateUtils';
import { NativeModules, Platform } from 'react-native';

function makeDb(initialRows: { daily_steps?: any[]; step_tracking_state?: any; kv_store?: any } = {}) {
  const tables: { [key: string]: any[] } = {
    daily_steps: initialRows.daily_steps ? [...initialRows.daily_steps] : [],
    calories_daily_summary: [],
    step_tracking_state: initialRows.step_tracking_state ? [initialRows.step_tracking_state] : [
      { id: 1, is_tracking: 1, is_paused: 0, is_vehicle_mode: 0, daily_goal: 8000 }
    ],
    kv_store: initialRows.kv_store ? [...initialRows.kv_store] : [],
  };

  return {
    async runAsync(sql: string, params: any[] = []) {
      if (sql.includes('INSERT INTO daily_steps')) {
        const [date, steps, distance_m, calories, goal, goal_met, created_at, updated_at] = params;
        const existingIdx = tables.daily_steps.findIndex(r => r.date === date);
        if (existingIdx >= 0) {
          const existing = tables.daily_steps[existingIdx];
          tables.daily_steps[existingIdx] = {
            ...existing,
            steps: Math.max(existing.steps, steps),
            distance_m: steps >= existing.steps ? distance_m : existing.distance_m,
            calories: steps >= existing.steps ? calories : existing.calories,
            goal,
            goal_met: Math.max(existing.steps, steps) >= goal ? 1 : 0,
            updated_at,
          };
        } else {
          tables.daily_steps.push({
            date, steps, distance_m, calories, goal, goal_met, created_at, updated_at
          });
        }
      }
      return { lastInsertRowId: 1 };
    },
    async getFirstAsync(sql: string, params: any[] = []) {
      if (sql.includes('FROM daily_steps WHERE date = ?')) {
        return tables.daily_steps.find(r => r.date === params[0]) || null;
      }
      if (sql.includes('FROM step_tracking_state WHERE id = 1')) {
        return tables.step_tracking_state[0] || null;
      }
      if (sql.includes('FROM calories_daily_summary WHERE date = ?')) {
        return tables.calories_daily_summary.find(r => r.date === params[0]) || null;
      }
      return null;
    },
    async getAllAsync(sql: string, params: any[] = []) {
      if (sql.includes('FROM daily_steps')) {
        return tables.daily_steps;
      }
      return [];
    },
  } as any;
}

beforeEach(() => {
  Platform.OS = 'android';
  useStepStore.setState({
    todaySteps: 0,
    todayDistance: 0,
    todayCalories: 0,
    dailyGoal: 8000,
    status: 'tracking',
    weeklyData: [],
    monthlyData: [],
  });
  delete (NativeModules as any).StepServiceModule;
});

test('hydrateStepStore loads today steps from SQLite database', async () => {
  const today = getTodayLocal();
  const db = makeDb({
    daily_steps: [
      { date: today, steps: 5400, distance_m: 4114.8, calories: 216, goal: 8000, goal_met: 1 }
    ]
  });

  await hydrateStepStore(db);

  const state = useStepStore.getState();
  expect(state.todaySteps).toBe(5400);
  expect(state.todayDistance).toBe(4114.8);
  expect(state.todayCalories).toBe(216);
});

test('hydrateStepStore loads live steps from NativeModules when available', async () => {
  const today = getTodayLocal();
  (NativeModules as any).StepServiceModule = {
    getStepData: jest.fn().mockResolvedValue({
      steps: 7250,
      distance: 5524.5,
      calories: 290,
      date: today,
    }),
  };

  const db = makeDb();
  await hydrateStepStore(db);

  const state = useStepStore.getState();
  expect(state.todaySteps).toBe(7250);
  expect(state.todayDistance).toBe(5524.5);
  expect(state.todayCalories).toBe(290);
});

test('hydrateStepStore takes highest count among native and DB to prevent step regression', async () => {
  const today = getTodayLocal();
  (NativeModules as any).StepServiceModule = {
    getStepData: jest.fn().mockResolvedValue({
      steps: 8000,
      distance: 6096,
      calories: 320,
      date: today,
    }),
  };

  const db = makeDb({
    daily_steps: [
      { date: today, steps: 5000, distance_m: 3810, calories: 200, goal: 8000, goal_met: 0 }
    ]
  });

  await hydrateStepStore(db);

  const state = useStepStore.getState();
  expect(state.todaySteps).toBe(8000);
});

test('saveStepData does not overwrite higher step count with 0', async () => {
  const today = getTodayLocal();
  const db = makeDb({
    daily_steps: [
      { date: today, steps: 6000, distance_m: 4572, calories: 240, goal: 8000, goal_met: 0 }
    ]
  });

  // Store currently has 0 (e.g. unhydrated state)
  useStepStore.setState({ todaySteps: 0, todayDistance: 0, todayCalories: 0 });
  await saveStepData(db, today);

  const row = await db.getFirstAsync('SELECT * FROM daily_steps WHERE date = ?', [today]);
  expect(row.steps).toBe(6000);
});
