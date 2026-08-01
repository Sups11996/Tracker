// ─── Design System ────────────────────────────────────────────────────────────

/** App background and surface colors */
export const COLORS = {
  // Backgrounds
  background: '#0D0F18',      // deeper dark for better glass contrast
  surface: '#14172200',       // transparent — let blur do the work
  surfaceHigh: '#1F2330',     // elevated surface (opaque fallback)

  // Glassmorphism surfaces — use these as backgroundColor on BlurView containers
  glass: 'rgba(255,255,255,0.09)',
  glassBorder: 'rgba(255,255,255,0.22)',
  glassHighlight: 'rgba(255,255,255,0.05)',
  glassDark: 'rgba(0,0,0,0.25)',          // darker glass for overlays

  // Text
  textPrimary: 'rgba(255,255,255,0.90)',
  textSecondary: 'rgba(255,255,255,0.58)',
  textMuted: 'rgba(255,255,255,0.32)',
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
  xxl: 24,   // glass card standard
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

// ─── Glass Tokens ─────────────────────────────────────────────────────────────
// Use these as the single source of truth. Never hard-code blur/border values.

export const GLASS = {
  /** expo-blur intensity for standard cards - increased for less transparency */
  blurCard: 40,
  /** expo-blur intensity for modals / overlays - increased for better readability */
  blurModal: 80,
  /** expo-blur intensity for the nav tab bar */
  blurNav: 60,
  /** expo-blur intensity for dim scrim behind modals */
  blurOverlay: 25,

  /** Card background tint on top of the BlurView */
  cardBg: 'rgba(255,255,255,0.09)' as string,
  /** Modal sheet background */
  modalBg: 'rgba(12,14,24,0.97)' as string,
  /** Overlay/scrim that dims content behind a modal */
  overlayBg: 'rgba(0,0,0,0.55)' as string,

  /** The "edge" border that sells the glass effect */
  border: 'rgba(255,255,255,0.22)' as string,
  borderSubtle: 'rgba(255,255,255,0.12)' as string,

  /** Soft drop shadow — large, low opacity */
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,             // Android
  },

  /** Radius used on every glass surface */
  radius: RADIUS.xxl,          // 24
  /** Tighter radius for nested chips / inner elements */
  radiusInner: RADIUS.lg,      // 16
} as const;

// ─── Motion Tokens ────────────────────────────────────────────────────────────
// All durations in ms. Use these + the spring config everywhere.

export const MOTION = {
  // Durations
  micro:      150,   // tiny state changes (chip tap, toggle)
  quick:      220,   // micro-interactions (button press feedback)
  standard:   300,   // card enter, element reveal
  screen:     350,   // screen / modal transitions

  // Easing names (used with Animated.timing easing param via Easing import)
  // For Reanimated withTiming, use the withTiming duration + easing directly
  easeOut: 'easeOut' as const,
  easeIn:  'easeIn'  as const,

  // Spring configs — reference these in withSpring / Animated.spring
  springSnappy: { damping: 18, stiffness: 320, mass: 0.9 },
  springBouncy: { damping: 14, stiffness: 260, mass: 1.0 },
  springGentle: { damping: 22, stiffness: 200, mass: 1.0 },

  // Stagger between list items (ms per item)
  stagger: 70,
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
