// ─── Design System ────────────────────────────────────────────────────────────

/** App background and surface colors */
export const COLORS = {
  // Backgrounds
  background: '#12141C',      // main screen background
  surface: '#1A1D27',         // card / sheet surface
  surfaceHigh: '#1F2330',     // elevated surface

  // Glassmorphism
  glass: 'rgba(255,255,255,0.06)',
  glassBorder: 'rgba(255,255,255,0.10)',
  glassHighlight: 'rgba(255,255,255,0.03)',

  // Text
  textPrimary: 'rgba(255,255,255,0.88)',
  textSecondary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.30)',
  textDisabled: 'rgba(255,255,255,0.18)',

  // Feature accent colors (matte / desaturated)
  steps:      '#6A8F7B',   // muted sage green
  sleep:      '#7B6FA0',   // dusty lavender
  water:      '#5B7FA6',   // slate blue
  calories:   '#A08050',   // muted amber
  screenTime: '#5C6B9E',   // soft indigo
  abc:        '#A06070',   // muted rose

  // Status
  success: '#5C8A6A',
  warning: '#A08050',
  error:   '#A05060',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

/** Spacing scale (multiples of 4) */
export const SPACING = {
  xs:   4,
  sm:   8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

/** Border radius scale */
export const RADIUS = {
  sm:   8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 28,
  full: 999,
} as const;

/** Typography sizes and weights */
export const TYPOGRAPHY = {
  size: {
    xs:    11,
    sm:    13,
    md:    15,
    lg:    17,
    xl:    20,
    xxl:   24,
    xxxl:  32,
    huge:  44,
  },
  weight: {
    regular:  '400' as const,
    medium:   '500' as const,
    semibold: '600' as const,
    bold:     '700' as const,
  },
  family: {
    regular:  'Inter_400Regular',
    medium:   'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold:     'Inter_700Bold',
  },
} as const;

// ─── Feature Defaults ─────────────────────────────────────────────────────────

export const DEFAULTS = {
  STEPS_GOAL:        8_000,
  WATER_GOAL_ML:     2_400,
  SLEEP_GOAL_MINS:   480,    // 8 hours
  SCREEN_GOAL_MINS:  120,    // 2 hours
} as const;

// ─── Storage Keys (SQLite KV store) ───────────────────────────────────────────

export const STORAGE_KEYS = {
  ONBOARDING_COMPLETE: 'onboarding_complete',
  USER_PROFILE:        'user_profile',
} as const;
