import { create } from 'zustand';

/** Temporary in-memory store — holds data as user moves through onboarding screens.
 *  Written to SQLite only at the final step. */

export interface OnboardingData {
  username: string;
  gender: 'male' | 'female' | 'other';
  age: string;
  height_cm: string;
  weight_kg: string;
  water_goal_ml: string;
  uses_gym: boolean;
  uses_abc: boolean;
}

interface OnboardingState {
  data: OnboardingData;
  update: (partial: Partial<OnboardingData>) => void;
  reset: () => void;
}

const DEFAULTS: OnboardingData = {
  username: '',
  gender: 'male',
  age: '',
  height_cm: '',
  weight_kg: '',
  water_goal_ml: '',
  uses_gym: false,
  uses_abc: false,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  data: { ...DEFAULTS },
  update: (partial) =>
    set((state) => ({ data: { ...state.data, ...partial } })),
  reset: () => set({ data: { ...DEFAULTS } }),
}));

/** Calculate recommended daily water goal in ml from weight in kg.
 *  Formula: weight_kg × 35 ml (WHO guideline) */
export function calcWaterGoal(weightKg: number): number {
  return Math.round(weightKg * 35);
}
