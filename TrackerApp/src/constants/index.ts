/** Storage keys (SecureStore / AsyncStorage) */
export const STORAGE_KEYS = {
  SESSION: 'supabase_session',
} as const;

/** Health feature daily defaults */
export const HEALTH_DEFAULTS = {
  STEPS_GOAL:        10_000,
  WATER_GOAL_ML:     2_500,
  SLEEP_GOAL_MINS:   480,   // 8 hours
  CALORIES_GOAL:     2_000,
  SCREEN_GOAL_MINS:  120,   // 2 hours
} as const;

/** UI / design tokens kept in JS for programmatic use */
export const COLORS = {
  primary:    '#3B82F6',
  background: '#F8FAFC',
  surface:    '#FFFFFF',
  border:     '#E2E8F0',
  textPrimary:   '#1E293B',
  textSecondary: '#64748B',
  textMuted:     '#94A3B8',
  // Feature accent
  steps:    '#10B981',
  water:    '#06B6D4',
  sleep:    '#8B5CF6',
  calories: '#F59E0B',
  screen:   '#EF4444',
} as const;
