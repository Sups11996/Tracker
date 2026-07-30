import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// ── Onboarding stack ──────────────────────────────────────────────────────────
export type OnboardingStackParamList = {
  Welcome: undefined;
  GenderAge: undefined;
  HeightWeight: undefined;
  WaterGoal: undefined;
  GymQuestion: undefined;
  AbcQuestion: undefined;
  Permissions: undefined;
  WaterContainers: undefined;
};

// ── Main bottom tabs ──────────────────────────────────────────────────────────
export type MainTabParamList = {
  Home: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

// ── Root stack ────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};

// ── Typed screen props helpers ────────────────────────────────────────────────
export type OnboardingScreenProps<T extends keyof OnboardingStackParamList> =
  NativeStackScreenProps<OnboardingStackParamList, T>;

export type MainTabProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;
