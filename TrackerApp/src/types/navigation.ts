import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// ── Auth stack ────────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  UsernameSetup: undefined;
};

// ── Main bottom tabs ──────────────────────────────────────────────────────────
export type MainTabParamList = {
  Home: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

// ── Root stack (wraps auth + main) ────────────────────────────────────────────
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

// ── Typed screen props helpers ────────────────────────────────────────────────
export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type MainTabProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;
