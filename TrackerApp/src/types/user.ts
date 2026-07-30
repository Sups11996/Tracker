export interface UserProfile {
  id: number;            // always 1 (single row)
  username: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  height_cm: number;
  weight_kg: number;
  water_goal_ml: number;
  uses_gym: boolean;
  uses_abc: boolean;
  onboarding_complete: boolean;
  created_at: string;    // ISO timestamp
  updated_at: string;
}
